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
import { ensureConfidence, toId } from "./utils";
export class Planner {
    buildPlan(objectives) {
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
