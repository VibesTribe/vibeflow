/**
 * vibeflow-meta:
 * id: src/core/eventEmitter.ts
 * task: REBUILD-V5
 * regions:
 *   - id: event-emitter
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:event-emitter */
import { LifecycleEvent } from "./types";

export type EventListener = (event: LifecycleEvent) => void | Promise<void>;

export class EventEmitter {
  private listeners: EventListener[] = [];

  on(listener: EventListener) {
    this.listeners.push(listener);
  }

  async emit(event: LifecycleEvent) {
    for (const listener of this.listeners) {
      await listener(event);
    }
  }
}
/* @endeditable */
