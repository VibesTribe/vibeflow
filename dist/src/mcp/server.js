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
import http from "http";
import path from "path";
import { URL } from "url";
import Ajv from "ajv";
import { createOrchestrator } from "../runtime/createOrchestrator";
import { normalizeTaskPacket } from "../runtime/normalizeTaskPacket";
import { runSkill } from "./tools/runSkill";
import { getTaskState } from "./tools/getTaskState";
import { emitNote } from "./tools/emitNote";
import { queryEvents } from "./tools/queryEvents";
const TASK_PACKET_SCHEMA_PATH = path.resolve("contracts/task_packet.schema.json");
const QUEUE_DIR = path.resolve("data/tasks/queued");
const AUTH_TOKEN = process.env.MCP_SERVER_TOKEN ?? null;
const validatorPromise = loadTaskPacketValidator();
let orchestratorRuntimePromise = null;
class McpServer {
    constructor(logger = console) {
        this.logger = logger;
        this.tools = new Map();
    }
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool ${tool.name} already registered`);
        }
        this.tools.set(tool.name, tool);
        this.logger.log(`[mcp] registered tool: ${tool.name}`);
    }
    listTools() {
        return Array.from(this.tools.values()).map(({ name, description }) => ({ name, description }));
    }
    async handleRequest(request) {
        const tool = this.tools.get(request.command);
        if (!tool) {
            throw new Error(`Unknown MCP command ${request.command}`);
        }
        const payload = request.payload ?? {};
        return tool.handler(payload);
    }
    start(options = {}) {
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
                    const data = await this.handleRequest(payload);
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
            }
            catch (error) {
                const statusCode = error.statusCode ?? 400;
                res.statusCode = statusCode;
                logger.error("[mcp] request handling failed", error);
                this.respondJson(res, { ok: false, error: error.message });
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
    requireToken(req) {
        if (!AUTH_TOKEN) {
            return;
        }
        const header = req.headers.authorization;
        if (!header || header !== `Bearer ${AUTH_TOKEN}`) {
            const error = new Error("Unauthorized");
            error.statusCode = 401;
            throw error;
        }
    }
    respondJson(res, payload) {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(payload));
    }
    async readJsonBody(req) {
        const body = await new Promise((resolve, reject) => {
            let data = "";
            req.on("data", (chunk) => {
                data += chunk;
            });
            req.on("end", () => resolve(data || "{}"));
            req.on("error", reject);
        });
        try {
            return JSON.parse(body);
        }
        catch (error) {
            throw new Error(`Invalid JSON payload: ${error.message}`);
        }
    }
    resolveUrl(req) {
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
export async function handleRequest(request) {
    return defaultServer.handleRequest(request);
}
export function startServer(options) {
    return defaultServer.start(options);
}
async function enqueueTask(packet, options = {}) {
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
async function loadTaskPacketValidator() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const schema = JSON.parse(fsSync.readFileSync(TASK_PACKET_SCHEMA_PATH, "utf8"));
    return ajv.compile(schema);
}
async function validateTaskPacketPayload(payload) {
    const validate = await validatorPromise;
    if (!validate(payload)) {
        const message = (validate.errors ?? [])
            .map((err) => `${err.instancePath || err.schemaPath} ${err.message}`.trim())
            .join("; ");
        throw new Error(`Task packet invalid: ${message}`);
    }
    return normalizeTaskPacket(payload);
}
function toQueuePayload(packet, autoDispatch) {
    const metadata = packet.metadata ? { ...packet.metadata } : {};
    if (autoDispatch) {
        metadata.autoDispatch = true;
        metadata.autoDispatchAt = new Date().toISOString();
    }
    const payload = {
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
async function getOrchestratorRuntime() {
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
