import { SLICE_BLUEPRINTS } from "../config/slices";
import { resolveProviderIcon } from "./icons";
const GENERAL_BLUEPRINT = {
    id: "general",
    name: "General",
    keywords: [],
    accent: "#94a3b8",
};
export function deriveSlices(tasks, events, agents, catalog) {
    if (!tasks || tasks.length === 0) {
        return [];
    }
    const agentMap = new Map(agents.map((agent) => [agent.id, mapAgent(agent)]));
    const eventByTask = new Map(events.map((event) => [event.taskId, event]));
    const catalogMap = new Map((catalog ?? []).map((entry) => [entry.id, entry]));
    const sliceAccumulator = new Map();
    for (const task of tasks) {
        const sliceMeta = resolveSliceMeta(task, catalogMap);
        const slice = sliceAccumulator.get(sliceMeta.id) ?? {
            id: sliceMeta.id,
            name: sliceMeta.name,
            accent: sliceMeta.accent,
            total: 0,
            completed: 0,
            active: 0,
            blocked: 0,
            mergePending: 0,
            tokens: sliceMeta.tokens,
            expectedTotal: sliceMeta.tasksTotal,
            expectedCompleted: sliceMeta.tasksDone,
            agents: [],
            tasks: [],
            assignments: [],
        };
        const associatedEvent = eventByTask.get(task.id);
        const bucket = classifyTask(task.status, associatedEvent);
        switch (bucket) {
            case "completed":
                slice.completed += 1;
                break;
            case "failed":
                slice.blocked += 1;
                break;
            case "active":
                slice.active += 1;
                break;
            case "pending":
            default:
                break;
        }
        slice.total += 1;
        if (task.mergePending) {
            slice.mergePending = (slice.mergePending ?? 0) + 1;
        }
        const mappedAgent = task.owner ? agentMap.get(task.owner) ?? null : null;
        // Only add agent to slice.agents if task is truly active (in_progress, review, testing, etc.)
        const isActiveTask = bucket === "active";
        if (mappedAgent && isActiveTask && !slice.agents.some((item) => item.id === mappedAgent.id)) {
            slice.agents.push(mappedAgent);
        }
        slice.tasks.push(task);
        slice.assignments.push({ task, agent: mappedAgent, isBlocking: bucket === "failed" });
        sliceAccumulator.set(slice.id, slice);
    }
    return Array.from(sliceAccumulator.values()).sort((a, b) => b.total - a.total);
}
export function mapAgent(agent) {
    const tier = agent.tier ? normalizeTier(agent.tier) : inferTier(agent.name);
    const tierCategory = tier === "W" ? "web" : tier === "M" ? "mcp" : "internal";
    return {
        id: agent.id,
        name: agent.name,
        tier,
        icon: resolveProviderIcon(agent.name),
        status: agent.status,
        summary: agent.summary,
        cooldownReason: agent.cooldownReason ?? null,
        costPerRunUsd: agent.costPerRunUsd,
        tierCategory,
        vendor: agent.vendor,
        capability: agent.capability ?? agent.summary,
        contextWindowTokens: agent.contextWindowTokens,
        effectiveContextWindowTokens: agent.effectiveContextWindowTokens,
        cooldownExpiresAt: agent.cooldownExpiresAt ?? null,
        creditStatus: agent.creditStatus ?? "unknown",
        rateLimitWindowSeconds: agent.rateLimitWindowSeconds ?? null,
        costPer1kTokensUsd: agent.costPer1kTokensUsd,
        warnings: agent.warnings ?? [],
    };
}
function resolveSliceMeta(task, catalogMap) {
    const catalogEntry = task.sliceId ? catalogMap.get(task.sliceId) : undefined;
    if (catalogEntry) {
        return {
            id: catalogEntry.id,
            name: catalogEntry.name,
            accent: catalogEntry.accent ?? GENERAL_BLUEPRINT.accent,
            tokens: catalogEntry.tokens,
            tasksTotal: catalogEntry.tasksTotal,
            tasksDone: catalogEntry.tasksDone,
        };
    }
    const blueprint = inferBlueprint(task);
    const fallbackCatalog = catalogMap.get(blueprint.id);
    return {
        id: task.sliceId ?? blueprint.id,
        name: fallbackCatalog?.name ?? blueprint.name,
        accent: fallbackCatalog?.accent ?? blueprint.accent,
        tokens: fallbackCatalog?.tokens,
        tasksTotal: fallbackCatalog?.tasksTotal,
        tasksDone: fallbackCatalog?.tasksDone,
    };
}
function inferBlueprint(task) {
    const title = (task.title ?? "").toLowerCase();
    for (const blueprint of SLICE_BLUEPRINTS) {
        if (blueprint.keywords.some((keyword) => title.includes(keyword))) {
            return blueprint;
        }
    }
    return GENERAL_BLUEPRINT;
}
const TRULY_ACTIVE_STATUSES = new Set([
    "in_progress",
    "received",
    "review",
    "testing",
]);
function isTrulyActive(status) {
    return TRULY_ACTIVE_STATUSES.has(status);
}
function classifyTask(status, event) {
    if (status === "failed" || event?.reasonCode?.startsWith("E/")) {
        return "failed";
    }
    if (isCompleted(status)) {
        return "completed";
    }
    if (isTrulyActive(status)) {
        return "active";
    }
    return "pending";
}
function normalizeTier(input) {
    const normalized = input.toUpperCase();
    if (normalized === "W" || normalized === "M" || normalized === "Q") {
        return normalized;
    }
    return inferTier(input);
}
function inferTier(name) {
    const lower = name.toLowerCase();
    if (/gpt|openai|turbo/.test(lower)) {
        return "W";
    }
    if (/gemini|claude|anthropic/.test(lower)) {
        return "M";
    }
    return "Q";
}
function isCompleted(status) {
    return ["complete", "merged", "merge_pending"].includes(status);
}
export function buildStatusSummary(tasks) {
    return tasks.reduce((acc, task) => {
        const bucket = classifyTask(task.status);
        acc.total += 1;
        if (bucket === "completed") {
            acc.completed += 1;
        }
        else if (bucket === "failed") {
            acc.blocked += 1;
        }
        else if (bucket === "active") {
            acc.active += 1;
        }
        // "pending" bucket doesn't increment any counter
        return acc;
    }, { total: 0, completed: 0, active: 0, blocked: 0 });
}
export function buildAgentSummaries(agents, slices) {
    return agents.map((agent) => {
        const assignmentRecords = collectAgentAssignments(agent, slices);
        const assignments = assignmentRecords.map((record) => record.assignment);
        const assigned = assignments.length;
        const succeeded = assignments.filter((assignment) => isCompleted(assignment.task.status)).length;
        const failed = assignments.filter((assignment) => assignment.isBlocking).length;
        const successRate = assigned === 0 ? 100 : Math.max(0, Math.round((succeeded / assigned) * 100));
        const tokensUsed = assignments.reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
        const tokensToday = (() => {
            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
            return assignmentRecords
                .filter((record) => {
                const updated = record.assignment.task.updatedAt ? new Date(record.assignment.task.updatedAt).valueOf() : 0;
                return updated >= cutoff;
            })
                .reduce((sum, record) => sum + (record.assignment.task.metrics?.tokensUsed ?? 0), 0);
        })();
        const avgRuntime = (() => {
            const samples = assignments.map((assignment) => assignment.task.metrics?.runtimeSeconds).filter((value) => typeof value === "number");
            if (samples.length === 0)
                return 0;
            return Math.round(samples.reduce((acc, value) => acc + value, 0) / samples.length);
        })();
        const primaryTask = assignments.find((assignment) => ACTIVE_STATUSES.has(assignment.task.status))?.task ?? null;
        const statusKey = normalizeAgentStatus(agent.status);
        const statusLabel = buildStatusLabel(agent.status, primaryTask);
        return {
            agent,
            assigned,
            succeeded,
            failed,
            successRate,
            tokensUsed,
            tokensToday,
            avgRuntime,
            primaryTask,
            statusKey,
            statusLabel,
            recentTasks: buildRecentTasks(assignmentRecords),
            cooldownRemainingLabel: calculateCooldownRemaining(agent),
            effectiveContextTokens: agent.effectiveContextWindowTokens ?? agent.contextWindowTokens,
        };
    });
}
export function collectAgentAssignments(agent, slices) {
    const records = [];
    slices.forEach((slice) => {
        slice.assignments.forEach((assignment) => {
            if (assignment.agent?.id === agent.id) {
                records.push({ assignment, slice });
            }
        });
    });
    return records;
}
export function buildRecentTasks(records) {
    return records
        .slice()
        .sort((a, b) => {
        const aDate = new Date(a.assignment.task.updatedAt ?? 0).valueOf();
        const bDate = new Date(b.assignment.task.updatedAt ?? 0).valueOf();
        return bDate - aDate;
    })
        .slice(0, 5)
        .map(({ assignment, slice }) => {
        const status = assignment.task.status;
        const outcome = isCompleted(status) ? "success" : assignment.isBlocking ? "fail" : "active";
        return {
            id: assignment.task.id,
            title: assignment.task.title ?? "Untitled task",
            taskNumber: assignment.task.taskNumber,
            status,
            runtimeSeconds: assignment.task.metrics?.runtimeSeconds,
            outcome,
            updatedAt: assignment.task.updatedAt,
            sliceName: slice.name,
        };
    });
}
export function calculateCooldownRemaining(agent) {
    if (!agent.cooldownExpiresAt) {
        return null;
    }
    const target = new Date(agent.cooldownExpiresAt).valueOf();
    const now = Date.now();
    if (Number.isNaN(target) || target <= now) {
        return "Ready";
    }
    const diff = target - now;
    return formatDuration(diff);
}
function formatDuration(ms) {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }
    return `${Math.max(1, minutes)}m`;
}
const ACTIVE_STATUSES = new Set(["pending", "in_progress", "received", "testing"]);
export function normalizeAgentStatus(status) {
    const lower = (status ?? "").toLowerCase().trim();
    if (lower.includes("credit"))
        return "credit";
    if (lower.includes("cooldown") || lower.includes("cool down"))
        return "cooldown";
    if (lower.includes("issue") || lower.includes("error") || lower.includes("failed"))
        return "issue";
    if (lower.includes("active") ||
        lower.includes("in_progress") ||
        lower.includes("in progress") ||
        lower.includes("working") ||
        lower.includes("running") ||
        lower.includes("received") ||
        lower.includes("receiving") ||
        lower.includes("processing")) {
        return "active";
    }
    return "ready";
}
export function buildStatusLabel(status, task) {
    if (task) {
        return `${formatStatusLabel(status)} · Working on ${task.taskNumber ?? task.title}`;
    }
    return formatStatusLabel(status);
}
export function formatStatusLabel(value) {
    if (!value)
        return "Unknown";
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
