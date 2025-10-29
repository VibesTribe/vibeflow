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
import { runSkill } from "./tools/runSkill";
import { getTaskState } from "./tools/getTaskState";
import { emitNote } from "./tools/emitNote";
import { queryEvents } from "./tools/queryEvents";

export interface McpRequest {
  command: "runSkill" | "getTaskState" | "emitNote" | "queryEvents";
  payload?: Record<string, unknown>;
}

export async function handleRequest(request: McpRequest) {
  switch (request.command) {
    case "runSkill":
      return runSkill(request.payload ?? {});
    case "getTaskState":
      return getTaskState();
    case "emitNote":
      return emitNote(request.payload ?? {});
    case "queryEvents":
      return queryEvents();
    default:
      throw new Error(`Unknown MCP command ${request.command}`);
  }
}
/* @endeditable */

