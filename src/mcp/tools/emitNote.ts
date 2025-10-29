/**
 * vibeflow-meta:
 * id: src/mcp/tools/emitNote.ts
 * task: REBUILD-V5
 * regions:
 *   - id: mcp-emit-note
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:mcp-emit-note */
import { promises as fs } from "fs";
import path from "path";

const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");

export async function emitNote(payload: Record<string, unknown>) {
  const event = {
    id: `note-${Date.now()}`,
    task_id: payload.taskId ?? "task/unknown",
    type: "note",
    timestamp: new Date().toISOString(),
    details: payload,
  };
  await fs.appendFile(EVENTS_PATH, `${JSON.stringify(event)}\n`);
  return event;
}
/* @endeditable */
