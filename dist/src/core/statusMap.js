/**
 * vibeflow-meta:
 * id: src/core/statusMap.ts
 * task: REBUILD-V5
 * regions:
 *   - id: status-map
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */
export const STATUS_ORDER = [
    "pending",
    "in_progress",
    "received",
    "review",
    "testing",
    "complete",
    "merge_pending",
    "merged",
    "failed",
];
export function canTransition(from, to) {
    if (to === "failed")
        return true;
    const fromIndex = STATUS_ORDER.indexOf(from);
    const toIndex = STATUS_ORDER.indexOf(to);
    return toIndex >= fromIndex;
}
/* @endeditable */
