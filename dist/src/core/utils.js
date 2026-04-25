/**
 * vibeflow-meta:
 * id: src/core/utils.ts
 * task: REBUILD-V5
 * regions:
 *   - id: core-utils
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */
/* @editable:core-utils */
import crypto from "crypto";
export function toId(prefix) {
    return `${prefix}/${crypto.randomBytes(4).toString("hex")}`;
}
export function ensureConfidence(value) {
    if (value < 0.95) {
        throw new Error(`Confidence ${value} violates 0.95 floor`);
    }
    return value;
}
export function now() {
    return new Date().toISOString();
}
export function groupBy(items, selector) {
    return items.reduce((acc, item) => {
        const key = selector(item);
        acc[key] = acc[key] ?? [];
        acc[key].push(item);
        return acc;
    }, {});
}
/* @endeditable */
