import { groupBy } from "@core/utils";
export function parseEventsLog(raw) {
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
        try {
            return normalizeEvent(JSON.parse(line));
        }
        catch (error) {
            console.warn("[events] unable to parse log line", error);
            return null;
        }
    })
        .filter((event) => Boolean(event))
        .sort((a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf());
}
export function groupEventsByTask(events) {
    return groupBy(events, (event) => event.taskId);
}
export function deriveQualityMap(events) {
    const grouped = groupEventsByTask(events);
    const quality = {};
    for (const [taskId, entries] of Object.entries(grouped)) {
        quality[taskId] = deriveTaskQuality(entries);
    }
    return quality;
}
export function deriveTaskQuality(events) {
    if (events.some((event) => event.type === "failure" || (event.reasonCode ?? "").startsWith("E/"))) {
        return "fail";
    }
    const latestStatusChange = events.find((event) => event.type === "status_change" && typeof event.details?.to === "string");
    const status = typeof latestStatusChange?.details?.to === "string" ? latestStatusChange.details.to : null;
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
const POSITIVE_STATUSES = new Set(["complete", "merged", "merge_pending"]);
const NEGATIVE_STATUSES = new Set(["failed"]);
const POSITIVE_EVENT_TYPES = new Set(["complete", "merged", "testing_passed", "human_approved"]);
function normalizeEvent(entry) {
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
function readString(source, key) {
    const value = source[key];
    return typeof value === "string" && value.trim().length > 0 ? value : null;
}
function readRecord(source, key) {
    const value = source[key];
    if (!value || typeof value !== "object") {
        return null;
    }
    return value;
}
function generateId(entry) {
    const task = readString(entry, "task_id") ?? readString(entry, "taskId") ?? "task";
    const ts = readString(entry, "timestamp") ?? Date.now().toString(36);
    const type = readString(entry, "type") ?? "unknown";
    return `${task}:${type}:${ts}`;
}
