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
import { TaskSnapshot, AgentSnapshot, FailureSnapshot, MergeCandidate } from "./types";

const STATE_PATH = path.resolve("data/state/task.state.json");

export interface TaskState {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  failures: FailureSnapshot[];
  merge_candidates: MergeCandidate[];
  metrics: Record<string, number>;
  updated_at: string;
}

export async function loadTaskState(): Promise<TaskState> {
  const content = await fs.readFile(STATE_PATH, "utf8");
  return JSON.parse(content) as TaskState;
}

export async function saveTaskState(state: TaskState): Promise<void> {
  const next = { ...state, updated_at: new Date().toISOString() };
  await fs.writeFile(STATE_PATH, JSON.stringify(next, null, 2));
}
/* @endeditable */
