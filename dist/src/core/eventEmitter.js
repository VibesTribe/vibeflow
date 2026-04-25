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
export class EventEmitter {
    constructor() {
        this.listeners = [];
    }
    on(listener) {
        this.listeners.push(listener);
    }
    async emit(event) {
        for (const listener of this.listeners) {
            await listener(event);
        }
    }
}
/* @endeditable */
