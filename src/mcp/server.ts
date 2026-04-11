/**
 * vibeflow-meta:
 * id: src/mcp/server.ts
 * task: REBUILD-V5
 * regions:
 *   - id: mcp-server
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:mcp-server */
import { promises as fs } from "fs";
import fsSync from "fs";
import http, { IncomingMessage } from "http";
import path from "path";
import { URL } from "url";
import Ajv, { type ValidateFunction } from "ajv";
import { TaskPacket } from "@core/types";
import { createOrchestrator } from "../runtime/createOrchestrator";
import { normalizeTaskPacket } from "../runtime/normalizeTaskPacket";
import { runSkill } from "./tools/runSkill";
import { getTaskState } from "./tools/getTaskState";
import { emitNote } from "./tools/emitNote";
import { queryEvents } from "./tools/queryEvents";

export type McpCommand = "runSkill" | "getTaskState" | "emitNote" | "queryEvents";

export interface McpRequest {
  command: McpCommand;
  payload?: Record<string, unknown>;
}

export interface McpResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface McpTool {
  name: McpCommand;
  description: string;
  handler: (payload: Record<string, unknown>) => Promise<unknown> | unknown;
}

export interface StartOptions {
  port?: number;
  host?: string;
  logger?: Pick<Console, "log" | "error" | "warn">;
  signal?: AbortSignal;
}

const TASK_PACKET_SCHEMA_PATH = path.resolve("contracts/task_packet.schema.json");
const QUEUE_DIR = path.resolve("data/tasks/queued");
const AUTH_TOKEN = process.env.MCP_SERVER_TOKEN ?? null;

const validatorPromise: Promise<ValidateFunction<unknown>> = loadTaskPacketValidator();
type OrchestratorRuntime = Awaited<ReturnType<typeof createOrchestrator>>;
let orchestratorRuntimePromise: Promise<OrchestratorRuntime> | null = null;

class McpServer {
  private readonly tools = new Map<McpCommand, McpTool>();

  constructor(private readonly logger: Pick<Console, "log" | "error" | "warn"> = console) {}

  registerTool(tool: McpTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
    this.logger.log(`[mcp] registered tool: ${tool.name}`);
  }

  listTools(): Array<Pick<McpTool, "name" | "description">> {
    return Array.from(this.tools.values()).map(({ name, description }) => ({ name, description }));
  }

  async handleRequest(request: McpRequest): Promise<unknown> {
    const tool = this.tools.get(request.command);
    if (!tool) {
      throw new Error(`Unknown MCP command ${request.command}`);
    }
    const payload = request.payload ?? {};
    return tool.handler(payload);
  }

  start(options: StartOptions = {}): Promise<http.Server> {
    const port = options.port ?? Number(process.env.MCP_SERVER_PORT ?? 3030);
    const host = options.host ?? "127.0.0.1";
    const logger = options.logger ?? this.logger;

    const server = http.createServer(async (req, res) => {
      try {
        const url = this.resolveUrl(req);
        if (req.method === "GET" && url.pathname === "/health") {
          this.respondJson(res, { ok: true, data: { status: "ready" } });
          return;
        }
        if (req.method === "GET" && url.pathname === "/tools") {
          this.respondJson(res, { ok: true, data: this.listTools() });
          return;
        }
        if (req.method === "POST" && url.pathname === "/") {
          const payload = await this.readJsonBody(req);
          const data = await this.handleRequest(payload as McpRequest);
          this.respondJson(res, { ok: true, data });
          return;
        }
        if (req.method === "POST" && url.pathname === "/run-task") {
          this.requireToken(req);
          const payload = await this.readJsonBody(req);
          const taskPacket = await validateTaskPacketPayload(payload);
          const runtime = await getOrchestratorRuntime();
          const decision = await runtime.orchestrator.dispatch(taskPacket);
          const queued = await enqueueTask(taskPacket, { autoDispatch: true, logger });
          this.respondJson(res, {
            ok: true,
            data: {
              status: "queued",
              task_id: taskPacket.taskId,
              provider: decision.provider,
              confidence: decision.confidence,
              queue_path: queued.queuePath,
            },
          });
          return;
        }

        res.statusCode = 404;
        this.respondJson(res, { ok: false, error: "Not found" });
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode ?? 400;
        res.statusCode = statusCode;
        logger.error("[mcp] request handling failed", error);
        this.respondJson(res, { ok: false, error: (error as Error).message });
      }
    });

    return new Promise((resolve, reject) => {
      server.on("error", reject);
      server.listen(port, host, () => {
        logger.log(`[mcp] server listening on http://${host}:${port}`);
        if (options.signal) {
          options.signal.addEventListener("abort", () => {
            logger.log("[mcp] shutdown requested");
            server.close();
          });
        }
        resolve(server);
      });
    });
  }

  private requireToken(req: IncomingMessage): void {
    if (!AUTH_TOKEN) {
      return;
    }
    const header = req.headers.authorization;
    if (!header || header !== `Bearer ${AUTH_TOKEN}`) {
      const error = new Error("Unauthorized");
      (error as { statusCode?: number }).statusCode = 401;
      throw error;
    }
  }

  private respondJson(res: http.ServerResponse, payload: McpResponse): void {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  }

  private async readJsonBody(req: IncomingMessage): Promise<unknown> {
    const body = await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => resolve(data || "{}"));
      req.on("error", reject);
    });

    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Invalid JSON payload: ${(error as Error).message}`);
    }
  }

  private resolveUrl(req: IncomingMessage): URL {
    const origin = `http://${req.headers.host ?? "localhost"}`;
    return new URL(req.url ?? "/", origin);
  }
}

const defaultServer = new McpServer();

defaultServer.registerTool({
  name: "runSkill",
  description: "Execute a registered skill runner and return its JSON output.",
  handler: (payload) => runSkill(payload),
});

defaultServer.registerTool({
  name: "getTaskState",
  description: "Load the latest task state snapshot from disk.",
  handler: () => getTaskState(),
});

defaultServer.registerTool({
  name: "emitNote",
  description: "Append a note event to the mission log.",
  handler: (payload) => emitNote(payload),
});

defaultServer.registerTool({
  name: "queryEvents",
  description: "Read lifecycle events from the mission log.",
  handler: () => queryEvents(),
});

export function listTools() {
  return defaultServer.listTools();
}

export async function handleRequest(request: McpRequest) {
  return defaultServer.handleRequest(request);
}

export function startServer(options?: StartOptions) {
  return defaultServer.start(options);
}

interface EnqueueOptions {
  autoDispatch?: boolean;
  logger?: Pick<Console, "log" | "error" | "warn">;
}

async function enqueueTask(packet: TaskPacket, options: EnqueueOptions = {}): Promise<{ queuePath: string; taskId: string }> {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  const safeId = packet.taskId?.replace(/[^a-z0-9/_-]+/gi, "-") ?? "task";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${safeId.replace(/\//g, "-")}-${timestamp}.json`;
  const queuePath = path.join(QUEUE_DIR, fileName);
  const payload = toQueuePayload(packet, options.autoDispatch === true);
  await fs.writeFile(queuePath, JSON.stringify(payload, null, 2), "utf8");
  options.logger?.log(`[mcp] queued ${packet.taskId} -> ${queuePath}`);
  return { queuePath, taskId: packet.taskId };
}

async function loadTaskPacketValidator(): Promise<ValidateFunction<unknown>> {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const schema = JSON.parse(fsSync.readFileSync(TASK_PACKET_SCHEMA_PATH, "utf8"));
  return ajv.compile(schema);
}

async function validateTaskPacketPayload(payload: unknown): Promise<TaskPacket> {
  const validate = await validatorPromise;
  if (!validate(payload)) {
    const message = (validate.errors ?? [])
      .map((err) => `${err.instancePath || err.schemaPath} ${err.message}`.trim())
      .join("; ");
    throw new Error(`Task packet invalid: ${message}`);
  }
  return normalizeTaskPacket(payload);
}

function toQueuePayload(packet: TaskPacket, autoDispatch: boolean): Record<string, unknown> {
  const metadata = packet.metadata ? { ...packet.metadata } : {};
  if (autoDispatch) {
    metadata.autoDispatch = true;
    metadata.autoDispatchAt = new Date().toISOString();
  }

  const payload: Record<string, unknown> = {
    task_id: packet.taskId,
    title: packet.title,
    objectives: packet.objectives,
    deliverables: packet.deliverables,
    confidence: packet.confidence,
    edit_scope: packet.editScope ?? [],
  };

  if (Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }

  return payload;
}

async function getOrchestratorRuntime(): Promise<OrchestratorRuntime> {
  if (!orchestratorRuntimePromise) {
    orchestratorRuntimePromise = createOrchestrator().catch((error) => {
      console.error("[mcp] orchestrator bootstrap failed", error);
      orchestratorRuntimePromise = null;
      throw error;
    });
  }
  return orchestratorRuntimePromise;
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[mcp] failed to start server", error);
    process.exit(1);
  });
}
/* @endeditable */
