/**
 * vibeflow-meta:
 * id: src/core/watcher.ts
 * task: REBUILD-V5
 * regions:
 *   - id: watcher
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */
/* @editable:watcher */
import { appendFileSync, mkdirSync } from "fs";
import path from "path";
import { now, toId } from "./utils";
const TIMEOUT_MS = 30 * 60 * 1000;
const STRIKE_THRESHOLD = 3;
const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");
export class Watcher {
    constructor() {
        this.seen = new Map();
    }
    observe(event) {
        const timestamp = Date.parse(event.timestamp);
        const safeTimestamp = Number.isFinite(timestamp) ? timestamp : Date.now();
        this.seen.set(event.taskId, {
            lastSeen: safeTimestamp,
            strikeCount: 0,
            reassigned: false,
        });
        if (event.type === "failure" && event.reasonCode) {
            return {
                taskId: event.taskId,
                reasonCode: event.reasonCode,
                createdAt: now(),
            };
        }
        return null;
    }
    scan() {
        const currentTime = Date.now();
        const alerts = [];
        for (const [taskId, state] of this.seen.entries()) {
            const elapsed = currentTime - state.lastSeen;
            if (elapsed <= TIMEOUT_MS) {
                continue;
            }
            const strikeLevel = Math.floor(elapsed / TIMEOUT_MS);
            if (strikeLevel <= state.strikeCount) {
                continue;
            }
            state.strikeCount = strikeLevel;
            if (state.strikeCount >= STRIKE_THRESHOLD && !state.reassigned) {
                state.reassigned = true;
                const alert = {
                    taskId,
                    reasonCode: "E/TIMEOUT",
                    createdAt: now(),
                };
                alerts.push(alert);
                this.persistReassignmentEvent(taskId, state);
            }
        }
        return alerts;
    }
    persistReassignmentEvent(taskId, state) {
        const event = {
            id: toId("event"),
            taskId,
            type: "reassigned",
            timestamp: now(),
            reasonCode: "E/TIMEOUT",
            details: {
                strikes: state.strikeCount,
                lastSeenAt: new Date(state.lastSeen).toISOString(),
                timeoutMs: TIMEOUT_MS,
            },
        };
        const persisted = {
            id: event.id,
            task_id: event.taskId,
            type: event.type,
            timestamp: event.timestamp,
            reason_code: event.reasonCode,
            details: event.details,
        };
        mkdirSync(path.dirname(EVENTS_PATH), { recursive: true });
        appendFileSync(EVENTS_PATH, `${JSON.stringify(persisted)}\n`);
    }
}
/* @endeditable */
