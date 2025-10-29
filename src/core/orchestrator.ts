/**
 * vibeflow-meta:
 * id: src/core/orchestrator.ts
 * task: REBUILD-V5
 * regions:
 *   - id: orchestrator
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:orchestrator */
import { Planner } from "./planner";
import { Router } from "./router";
import { EventEmitter } from "./eventEmitter";
import { loadTaskState, saveTaskState } from "./taskState";
import { LifecycleEvent, TaskPacket, TaskSnapshot } from "./types";

export class Orchestrator {
  constructor(
    private readonly planner: Planner,
    private readonly router: Router,
    private readonly events: EventEmitter
  ) {}

  async plan(objectives: string[]): Promise<TaskPacket[]> {
    const plan = this.planner.buildPlan(objectives);
    return plan.map((node) => {
      const { depends_on, ...packet } = node;
      void depends_on;
      return packet;
    });
  }

  async dispatch(packet: TaskPacket): Promise<void> {
    const decision = this.router.decide("dag_executor");
    const event: LifecycleEvent = {
      id: `${packet.taskId}:dispatch`,
      taskId: packet.taskId,
      type: "status_change",
      timestamp: new Date().toISOString(),
      details: { to: "in_progress", provider: decision.provider },
    };
    await this.events.emit(event);
    const state = await loadTaskState();
    const snapshot: TaskSnapshot = {
      id: packet.taskId,
      title: packet.title,
      status: "in_progress",
      confidence: packet.confidence,
      updatedAt: event.timestamp,
      owner: decision.provider,
      lessons: [],
    };
    state.tasks = state.tasks.filter((task) => task.id !== packet.taskId).concat(snapshot);
    await saveTaskState(state);
  }
}
/* @endeditable */

