/**
 * vibeflow-meta:
 * id: src/mcp/tools/queryEvents.ts
 * task: REBUILD-V5
 * regions:
 *   - id: mcp-query-events
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:mcp-query-events */
import { promises as fs } from "fs";
import path from "path";

const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");

export async function queryEvents() {
  const rows = await fs.readFile(EVENTS_PATH, "utf8");
  return rows
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
/* @endeditable */

