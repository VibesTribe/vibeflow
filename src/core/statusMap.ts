/**
 * vibeflow-meta:
 * id: src/core/statusMap.ts
 * task: REBUILD-V5
 * regions:
 *   - id: status-map
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:status-map */
import { TaskStatus } from "./types";

export const STATUS_ORDER: TaskStatus[] = [
  "assigned",
  "in_progress",
  "received",
  "supervisor_review",
  "testing",
  "supervisor_approval",
  "ready_to_merge",
  "complete",
  "blocked",
];

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (to === "blocked") return true;
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  return toIndex >= fromIndex;
}
/* @endeditable */
