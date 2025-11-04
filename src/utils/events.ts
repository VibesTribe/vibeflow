import { groupBy } from "@core/utils";

export interface MissionEvent {
  id: string;
  taskId: string;
  type: string;
  timestamp: string;
  reasonCode?: string;
  details?: Record<string, unknown> | null;
}

export type MissionEventQuality = "pass" | "fail" | "pending";

export function parseEventsLog(raw: string): MissionEvent[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return normalizeEvent(JSON.parse(line) as Record<string, unknown>);
      } catch (error) {
        console.warn("[events] unable to parse log line", error);
        return null;
      }
    })
    .filter((event): event is MissionEvent => Boolean(event))
    .sort((a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf());
}

export function groupEventsByTask(events: MissionEvent[]): Record<string, MissionEvent[]> {
  return groupBy(events, (event) => event.taskId);
}

export function deriveQualityMap(events: MissionEvent[]): Record<string, MissionEventQuality> {
  const grouped = groupEventsByTask(events);
  const quality: Record<string, MissionEventQuality> = {};

  for (const [taskId, entries] of Object.entries(grouped)) {
    quality[taskId] = deriveTaskQuality(entries);
  }

  return quality;
}

export function deriveTaskQuality(events: MissionEvent[]): MissionEventQuality {
  if (events.some((event) => event.type === "failure" || (event.reasonCode ?? "").startsWith("E/"))) {
    return "fail";
  }

  const latestStatusChange = events.find((event) => event.type === "status_change" && typeof event.details?.to === "string");
  const status = typeof latestStatusChange?.details?.to === "string" ? (latestStatusChange.details!.to as string) : null;

  if (status && POSITIVE_STATUSES.has(status)) {
    return "pass";
  }
  if (status && NEGATIVE_STATUSES.has(status)) {
    return "fail";
  }

  if (events.some((event) => POSITIVE_EVENT_TYPES.has(event.type))) {
    return "pass";
  }

  return "pending";
}

const POSITIVE_STATUSES = new Set(["supervisor_approval", "ready_to_merge", "complete"]);
const NEGATIVE_STATUSES = new Set(["blocked"]);
const POSITIVE_EVENT_TYPES = new Set(["ready_to_merge", "complete", "testing_passed", "supervisor_approved"]);

function normalizeEvent(entry: Record<string, unknown>): MissionEvent {
  const id = readString(entry, "id") ?? generateId(entry);
  const taskId = readString(entry, "task_id") ?? readString(entry, "taskId") ?? "task/unknown";
  const type = readString(entry, "type") ?? "unknown";
  const timestamp = readString(entry, "timestamp") ?? new Date().toISOString();
  const reasonCode = readString(entry, "reason_code") ?? readString(entry, "reasonCode") ?? undefined;
  const details = readRecord(entry, "details");

  return {
    id,
    taskId,
    type,
    timestamp,
    reasonCode,
    details,
  };
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readRecord(source: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = source[key];
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

function generateId(entry: Record<string, unknown>): string {
  const task = readString(entry, "task_id") ?? readString(entry, "taskId") ?? "task";
  const ts = readString(entry, "timestamp") ?? Date.now().toString(36);
  const type = readString(entry, "type") ?? "unknown";
  return `${task}:${type}:${ts}`;
}
