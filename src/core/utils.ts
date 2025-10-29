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

export function toId(prefix: string): string {
  return `${prefix}/${crypto.randomBytes(4).toString("hex")}`;
}

export function ensureConfidence(value: number): number {
  if (value < 0.95) {
    throw new Error(`Confidence ${value} violates 0.95 floor`);
  }
  return value;
}

export function now(): string {
  return new Date().toISOString();
}

export function groupBy<T>(items: T[], selector: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = selector(item);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {});
}
/* @endeditable */
