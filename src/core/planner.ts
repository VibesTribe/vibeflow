/**
 * vibeflow-meta:
 * id: src/core/planner.ts
 * task: REBUILD-V5
 * regions:
 *   - id: planner
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:planner */
import { TaskPacket } from "./types";
import { ensureConfidence, toId } from "./utils";

export interface PlanNode extends TaskPacket {
  depends_on: string[];
}

export class Planner {
  buildPlan(objectives: string[]): PlanNode[] {
    if (objectives.length === 0) {
      return [];
    }

    return objectives.map((objective) => ({
      taskId: toId("task"),
      title: objective,
      objectives: [objective],
      deliverables: [`docs/${objective.replace(/\s+/g, "-").toLowerCase()}.md`],
      confidence: ensureConfidence(0.95),
      editScope: [],
      depends_on: [],
    }));
  }
}
/* @endeditable */
