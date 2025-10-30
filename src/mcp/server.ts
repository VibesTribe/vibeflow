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
import http, { IncomingMessage } from "http";
import { URL } from "url";
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

        res.statusCode = 404;
        this.respondJson(res, { ok: false, error: "Not found" });
      } catch (error) {
        logger.error("[mcp] request handling failed", error);
        res.statusCode = 400;
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

if (require.main === module) {
  startServer().catch((error) => {
    console.error("[mcp] failed to start server", error);
    process.exit(1);
  });
}
/* @endeditable */
