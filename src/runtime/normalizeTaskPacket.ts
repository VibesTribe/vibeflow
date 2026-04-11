import { TaskPacket } from "@core/types";

interface RawTaskPacket {
  [key: string]: unknown;
}

export function normalizeTaskPacket(raw: unknown): TaskPacket {
  if (!raw || typeof raw !== "object") {
    throw new Error("Task packet payload must be an object");
  }

  const source = raw as RawTaskPacket;
  const taskId = readString(source, "taskId") ?? readString(source, "task_id");
  const title = readString(source, "title");
  const objectives = readStringArray(source, "objectives");
  const deliverables = readStringArray(source, "deliverables");
  const confidence = readNumber(source, "confidence");
  const editScope = readStringArray(source, "editScope", [], "edit_scope");
  const metadata = readRecord(source, "metadata");

  if (!taskId) {
    throw new Error("Task packet missing taskId/task_id");
  }
  if (!title) {
    throw new Error("Task packet missing title");
  }
  if (objectives.length === 0) {
    throw new Error("Task packet objectives must be a non-empty array");
  }
  if (deliverables.length === 0) {
    throw new Error("Task packet deliverables must be a non-empty array");
  }
  if (!Number.isFinite(confidence)) {
    throw new Error("Task packet confidence must be numeric");
  }

  return {
    taskId,
    title,
    objectives,
    deliverables,
    confidence,
    editScope,
    metadata: metadata ?? undefined,
  };
}

function readString(source: RawTaskPacket, key: string): string | null {
  const value = source[key];
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return null;
}

function readNumber(source: RawTaskPacket, key: string): number {
  const value = source[key];
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return Number.NaN;
}

function readStringArray(source: RawTaskPacket, key: string, fallback: string[] = [], legacyKey?: string): string[] {
  const value = source[key] ?? (legacyKey ? source[legacyKey] : undefined);
  if (!Array.isArray(value)) {
    return [...fallback];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readRecord(source: RawTaskPacket, key: string) {
  const value = source[key];
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

