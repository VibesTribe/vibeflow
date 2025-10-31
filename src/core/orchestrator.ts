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
import { promises as fs } from "fs";
import path from "path";
import { Planner } from "./planner";
import { Router } from "./router";
import { EventEmitter } from "./eventEmitter";
import { loadTaskState, saveTaskState, TaskState } from "./taskState";
import { LifecycleEvent, TaskPacket, TaskSnapshot, RouterDecision } from "./types";
import { now, toId } from "./utils";

const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");

type StoredTaskSnapshot = TaskSnapshot & { updated_at?: string };
type PersistedTaskSnapshot = TaskSnapshot & { updated_at: string };

type PersistedEvent = Omit<LifecycleEvent, "taskId" | "reasonCode"> & {
  task_id: string;
  reason_code?: string;
};

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

  async dispatch(packet: TaskPacket): Promise<RouterDecision> {
    const decision = this.router.decide("dag_executor");
    const timestamp = now();
    const assignedEvent: LifecycleEvent = {
      id: toId("event"),
      taskId: packet.taskId,
      type: "status_change",
      timestamp,
      details: {
        to: "assigned",
        provider: decision.provider,
        confidence: decision.confidence,
        title: packet.title,
      },
    };

    await this.persistEvent(assignedEvent);
    await this.events.emit(assignedEvent);
    await this.updateTaskState(packet, decision, timestamp);
    return decision;
  }

  private async persistEvent(event: LifecycleEvent): Promise<void> {
    const { taskId, reasonCode, ...rest } = event;
    const payload: PersistedEvent = {
      ...rest,
      task_id: taskId,
      ...(reasonCode ? { reason_code: reasonCode } : {}),
    };

    await fs.mkdir(path.dirname(EVENTS_PATH), { recursive: true });
    await fs.appendFile(EVENTS_PATH, `${JSON.stringify(payload)}\n`);
  }

  private async updateTaskState(
    packet: TaskPacket,
    decision: RouterDecision,
    timestamp: string
  ): Promise<void> {
    const state = (await loadTaskState()) as TaskState;
    const tasks = (state.tasks as StoredTaskSnapshot[])
      .filter((task) => task.id !== packet.taskId)
      .map((task) => this.normalizeTaskSnapshot(task, timestamp));

    tasks.push(this.createAssignedSnapshot(packet, decision, timestamp));

    const nextState: TaskState = {
      ...state,
      tasks: tasks as unknown as TaskSnapshot[],
    };

    await saveTaskState(nextState);
  }

  private createAssignedSnapshot(
    packet: TaskPacket,
    decision: RouterDecision,
    timestamp: string
  ): PersistedTaskSnapshot {
    return {
      id: packet.taskId,
      title: packet.title,
      status: "assigned",
      confidence: packet.confidence,
      owner: decision.provider,
      lessons: [],
      updatedAt: timestamp,
      updated_at: timestamp,
    };
  }

  private normalizeTaskSnapshot(task: StoredTaskSnapshot, fallbackTimestamp: string): PersistedTaskSnapshot {
    const updated_at = task.updated_at ?? task.updatedAt ?? fallbackTimestamp;
    return {
      ...task,
      lessons: task.lessons ?? [],
      updatedAt: task.updatedAt ?? updated_at,
      updated_at,
    };
  }
}
/* @endeditable */
