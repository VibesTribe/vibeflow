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
import { loadTaskState, saveTaskState } from "./taskState";
import { now, toId } from "./utils";
const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");
export class Orchestrator {
    constructor(planner, router, events) {
        this.planner = planner;
        this.router = router;
        this.events = events;
    }
    async plan(objectives) {
        const plan = this.planner.buildPlan(objectives);
        return plan.map((node) => {
            const { depends_on, ...packet } = node;
            void depends_on;
            return packet;
        });
    }
    async dispatch(packet) {
        const decision = this.router.decide("dag_executor");
        const timestamp = now();
        const assignedEvent = {
            id: toId("event"),
            taskId: packet.taskId,
            type: "status_change",
            timestamp,
            details: {
                to: "in_progress",
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
    async persistEvent(event) {
        const { taskId, reasonCode, ...rest } = event;
        const payload = {
            ...rest,
            task_id: taskId,
            ...(reasonCode ? { reason_code: reasonCode } : {}),
        };
        await fs.mkdir(path.dirname(EVENTS_PATH), { recursive: true });
        await fs.appendFile(EVENTS_PATH, `${JSON.stringify(payload)}\n`);
    }
    async updateTaskState(packet, decision, timestamp) {
        const state = (await loadTaskState());
        const tasks = state.tasks
            .filter((task) => task.id !== packet.taskId)
            .map((task) => this.normalizeTaskSnapshot(task, timestamp));
        tasks.push(this.createAssignedSnapshot(packet, decision, timestamp));
        const nextState = {
            ...state,
            tasks: tasks,
        };
        await saveTaskState(nextState);
    }
    createAssignedSnapshot(packet, decision, timestamp) {
        return {
            id: packet.taskId,
            title: packet.title,
            status: "in_progress",
            confidence: packet.confidence,
            owner: decision.provider,
            lessons: [],
            updatedAt: timestamp,
            updated_at: timestamp,
        };
    }
    normalizeTaskSnapshot(task, fallbackTimestamp) {
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
