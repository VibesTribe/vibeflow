/**
 * vibeflow-meta:
 * id: src/mcp/tools/getTaskState.ts
 * task: REBUILD-V5
 * regions:
 *   - id: mcp-get-task-state
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:mcp-get-task-state */
import { loadTaskState } from "@core/taskState";

export async function getTaskState() {
  return loadTaskState();
}
/* @endeditable */
