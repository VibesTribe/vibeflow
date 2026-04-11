/**
 * vibeflow-meta:
 * id: src/adapters/mastraRunner.ts
 * task: REBUILD-V5
 * regions:
 *   - id: mastra-runner
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:mastra-runner */
import { PlanNode } from "@core/planner";

export async function executeMastra(plan: PlanNode[]) {
  return plan.map((node) => ({
    id: node.taskId,
    status: "completed",
    duration_ms: 1500,
  }));
}
/* @endeditable */
