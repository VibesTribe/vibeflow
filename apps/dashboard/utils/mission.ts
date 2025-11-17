import { AgentSnapshot, TaskSnapshot, TaskStatus } from "@core/types";
import { SLICE_BLUEPRINTS, SliceBlueprint } from "../config/slices";
import { resolveProviderIcon } from "./icons";

export type AgentCreditStatus = "available" | "low" | "depleted" | "unknown";

export interface MissionAgent {
  id: string;
  name: string;
  tier: AgentTier;
  icon: string;
  status: string;
  summary?: string;
  cooldownReason?: string | null;
  costPerRunUsd?: number;
  tierCategory: "web" | "mcp" | "internal";
  vendor?: string;
  capability?: string;
  contextWindowTokens?: number;
  effectiveContextWindowTokens?: number;
  cooldownExpiresAt?: string | null;
  creditStatus?: AgentCreditStatus;
  rateLimitWindowSeconds?: number | null;
  costPer1kTokensUsd?: number;
  warnings?: string[];
}

export interface AgentRecentTask {
  id: string;
  title: string;
  taskNumber?: string;
  status: TaskStatus;
  runtimeSeconds?: number;
  outcome: "success" | "fail" | "active";
  updatedAt?: string;
  sliceName?: string;
}

export interface AgentLiveAssignment {
  taskId: string;
  title: string;
  sliceName?: string;
  status: TaskStatus;
  summary?: string;
}

export interface AgentRoutingDecision {
  id: string;
  timestamp: string;
  direction: "from" | "to" | "retry" | "validation";
  label: string;
  reason?: string;
}

export interface AgentTokenStats {
  today: number;
  lifetime: number;
  average: number;
  peak: number;
}

export interface AgentPerformanceStats {
  avgRuntime: number;
  p95Runtime: number;
  contextWindow?: number;
  effectiveContextWindow?: number;
  costPerRunUsd?: number;
  costPer1kTokensUsd?: number;
  rateLimitWindowSeconds?: number | null;
}

export interface SliceAssignment {
  task: TaskSnapshot;
  agent: MissionAgent | null;
  isBlocking: boolean;
}

export interface MissionSlice {
  id: string;
  name: string;
  accent: string;
  total: number;
  completed: number;
  active: number;
  blocked: number;
  tokens?: number;
  expectedTotal?: number;
  expectedCompleted?: number;
  agents: MissionAgent[];
  tasks: TaskSnapshot[];
  assignments: SliceAssignment[];
}

export type AgentTier = "W" | "M" | "Q";

export interface SliceCatalog {
  id: string;
  name: string;
  accent?: string;
  tokens?: number;
  tasksTotal?: number;
  tasksDone?: number;
}

const GENERAL_BLUEPRINT: SliceBlueprint = {
  id: "general",
  name: "General",
  keywords: [],
  accent: "#94a3b8",
};

export function deriveSlices(
  tasks: TaskSnapshot[],
  events: MissionEvent[],
  agents: AgentSnapshot[],
  catalog?: SliceCatalog[]
): MissionSlice[] {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const agentMap = new Map(agents.map((agent) => [agent.id, mapAgent(agent)]));
  const eventByTask = new Map<string, MissionEvent>(events.map((event) => [event.taskId, event]));
  const catalogMap = new Map((catalog ?? []).map((entry) => [entry.id, entry]));

  const sliceAccumulator = new Map<string, MissionSlice>();

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
      case "blocked":
        slice.blocked += 1;
        break;
      default:
        slice.active += 1;
        break;
    }
    slice.total += 1;

    const mappedAgent = task.owner ? agentMap.get(task.owner) ?? null : null;
    if (mappedAgent && !slice.agents.some((item) => item.id === mappedAgent.id)) {
      slice.agents.push(mappedAgent);
    }

    slice.tasks.push(task);
    slice.assignments.push({ task, agent: mappedAgent, isBlocking: bucket === "blocked" });
    sliceAccumulator.set(slice.id, slice);
  }

  return Array.from(sliceAccumulator.values()).sort((a, b) => b.total - a.total);
}

export function mapAgent(agent: AgentSnapshot): MissionAgent {
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

function resolveSliceMeta(task: TaskSnapshot, catalogMap: Map<string, SliceCatalog>) {
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

function inferBlueprint(task: TaskSnapshot): SliceBlueprint {
  const title = (task.title ?? "").toLowerCase();

  for (const blueprint of SLICE_BLUEPRINTS) {
    if (blueprint.keywords.some((keyword) => title.includes(keyword))) {
      return blueprint;
    }
  }

  return GENERAL_BLUEPRINT;
}

function classifyTask(status: TaskStatus, event?: MissionEvent): "completed" | "blocked" | "active" {
  if (status === "blocked" || event?.reasonCode?.startsWith("E/")) {
    return "blocked";
  }
  if (isCompleted(status)) {
    return "completed";
  }
  return "active";
}

function normalizeTier(input: string): AgentTier {
  const normalized = input.toUpperCase();
  if (normalized === "W" || normalized === "M" || normalized === "Q") {
    return normalized;
  }
  return inferTier(input);
}

function inferTier(name: string): AgentTier {
  const lower = name.toLowerCase();
  if (/gpt|openai|turbo/.test(lower)) {
    return "W";
  }
  if (/gemini|claude|anthropic/.test(lower)) {
    return "M";
  }
  return "Q";
}

function isCompleted(status: TaskStatus): boolean {
  return ["ready_to_merge", "complete", "supervisor_approval"].includes(status);
}

export interface StatusSummary {
  total: number;
  completed: number;
  active: number;
  blocked: number;
}

export function buildStatusSummary(tasks: TaskSnapshot[]): StatusSummary {
  return tasks.reduce<StatusSummary>(
    (acc, task) => {
      const bucket = classifyTask(task.status);
      acc.total += 1;
      if (bucket === "completed") {
        acc.completed += 1;
      } else if (bucket === "blocked") {
        acc.blocked += 1;
      } else {
        acc.active += 1;
      }
      return acc;
    },
    { total: 0, completed: 0, active: 0, blocked: 0 }
  );
}

