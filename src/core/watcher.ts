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
import { WatcherAlert, LifecycleEvent } from "./types";

const TIMEOUT_MS = 30 * 60 * 1000;

export class Watcher {
  private readonly seen = new Map<string, number>();

  observe(event: LifecycleEvent): WatcherAlert | null {
    this.seen.set(event.taskId, Date.parse(event.timestamp));
    if (event.type === "failure" && event.reasonCode) {
      return {
        taskId: event.taskId,
        reasonCode: event.reasonCode,
        createdAt: new Date().toISOString(),
      };
    }
    return null;
  }

  scan(): WatcherAlert[] {
    const now = Date.now();
    const alerts: WatcherAlert[] = [];
    for (const [taskId, timestamp] of this.seen.entries()) {
      if (now - timestamp > TIMEOUT_MS) {
        alerts.push({
          taskId,
          reasonCode: "E/TASK_TIMEOUT",
          createdAt: new Date().toISOString(),
        });
      }
    }
    return alerts;
  }
}
/* @endeditable */
