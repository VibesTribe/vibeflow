import { AgentSnapshot, TaskSnapshot } from "@core/types";
import { MissionEvent } from "../../../src/utils/events";
import { SLICE_BLUEPRINTS, SliceBlueprint } from "../config/slices";
import { resolveProviderIcon } from "./icons";

export interface MissionAgent {
  id: string;
  name: string;
  tier: AgentTier;
  icon: string;
  status: string;
}

export interface MissionSlice {
  id: string;
  name: string;
  accent: string;
  total: number;
  completed: number;
  active: number;
  blocked: number;
  agents: MissionAgent[];
  tasks: TaskSnapshot[];
}

export type AgentTier = "W" | "M" | "Q";

const GENERAL_BLUEPRINT: SliceBlueprint = {
  id: "general",
  name: "General",
  keywords: [],
  accent: "#94a3b8",
};

export function deriveSlices(tasks: TaskSnapshot[], events: MissionEvent[], agents: AgentSnapshot[]): MissionSlice[] {
  if (!tasks || tasks.length === 0) {
    return [];
  }

  const agentMap = new Map(agents.map((agent) => [agent.id, mapAgent(agent)]));
  const eventByTask = new Map<string, MissionEvent>(events.map((event) => [event.taskId, event]));

  const sliceAccumulator = new Map<string, MissionSlice>();

  for (const task of tasks) {
    const blueprint = resolveBlueprint(task);
    const slice = sliceAccumulator.get(blueprint.id) ?? {
      id: blueprint.id,
      name: blueprint.name,
      accent: blueprint.accent,
      total: 0,
      completed: 0,
      active: 0,
      blocked: 0,
      agents: [],
      tasks: [],
    };

    slice.total += 1;
    if (isCompleted(task.status)) {
      slice.completed += 1;
    } else if (task.status === "blocked") {
      slice.blocked += 1;
    } else {
      slice.active += 1;
    }

    if (task.owner) {
      const mappedAgent = agentMap.get(task.owner);
      if (mappedAgent && !slice.agents.find((item) => item.id === mappedAgent.id)) {
        slice.agents.push(mappedAgent);
      }
    }

    const lastEvent = eventByTask.get(task.id);
    if (lastEvent && lastEvent.reasonCode?.startsWith("E/")) {
      slice.blocked += 1;
    }

    slice.tasks.push(task);
    sliceAccumulator.set(slice.id, slice);
  }

  return Array.from(sliceAccumulator.values()).sort((a, b) => b.total - a.total);
}

export function mapAgent(agent: AgentSnapshot): MissionAgent {
  return {
    id: agent.id,
    name: agent.name,
    tier: inferTier(agent.name),
    icon: resolveProviderIcon(agent.name),
    status: agent.status,
  };
}

function resolveBlueprint(task: TaskSnapshot): SliceBlueprint {
  const title = (task.title ?? "").toLowerCase();

  for (const blueprint of SLICE_BLUEPRINTS) {
    if (blueprint.keywords.some((keyword) => title.includes(keyword))) {
      return blueprint;
    }
  }

  return GENERAL_BLUEPRINT;
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

function isCompleted(status: string): boolean {
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
      acc.total += 1;
      if (isCompleted(task.status)) {
        acc.completed += 1;
      } else if (task.status === "blocked") {
        acc.blocked += 1;
      } else {
        acc.active += 1;
      }
      return acc;
    },
    { total: 0, completed: 0, active: 0, blocked: 0 }
  );
}
