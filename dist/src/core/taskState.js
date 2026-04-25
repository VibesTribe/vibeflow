/**
 * vibeflow-meta:
 * id: src/core/taskState.ts
 * task: REBUILD-V5
 * regions:
 *   - id: task-state
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */
/* @editable:task-state */
import { promises as fs } from "fs";
import path from "path";
const STATE_PATH = path.resolve("data/state/task.state.json");
export async function loadTaskState() {
    const content = await fs.readFile(STATE_PATH, "utf8");
    return JSON.parse(content);
}
export async function saveTaskState(state) {
    const next = { ...state, updated_at: new Date().toISOString() };
    await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2));
}
/* @endeditable */
