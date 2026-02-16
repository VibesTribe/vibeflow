/**
 * VibePilot Supabase Adapter
 *
 * Transforms VibePilot's Supabase data to Vibeflow Dashboard shape.
 * Falls back to mock data if Supabase not configured.
 */

import { AgentSnapshot, TaskSnapshot } from "@core/types";
import { SliceCatalog } from "../utils/mission";

// VibePilot config - models we have direct access to
const VIBEPILOT_MODELS = [
  {
    id: "gemini-api",
    name: "Gemini API",
    provider: "google",
    access_type: "api",
    context_limit: 1000000,
    vendor: "Google",
    tier: "Q" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/google-gemini.svg",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    access_type: "api",
    context_limit: 64000,
    vendor: "DeepSeek",
    tier: "Q" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/deepseek.svg",
  },
  {
    id: "kimi-cli",
    name: "Kimi CLI",
    provider: "moonshot",
    access_type: "cli_subscription",
    context_limit: 200000,
    vendor: "Moonshot",
    tier: "Q" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/default.svg",
  },
  {
    id: "opencode",
    name: "OpenCode (GLM-5)",
    provider: "zhipu",
    access_type: "cli_subscription",
    context_limit: 128000,
    vendor: "Zhipu",
    tier: "Q" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/default.svg",
  },
];

// VibePilot platforms - where couriers deliver
const VIBEPILOT_PLATFORMS = [
  {
    id: "gemini",
    name: "Gemini (Web)",
    vendor: "Google",
    tier: "W" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/google-gemini.svg",
    context_limit: 1000000,
  },
  {
    id: "claude",
    name: "Claude (Web)",
    vendor: "Anthropic",
    tier: "W" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/anthropic.svg",
    context_limit: 200000,
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    vendor: "OpenAI",
    tier: "W" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/openai.svg",
    context_limit: 128000,
  },
  {
    id: "copilot",
    name: "Copilot",
    vendor: "Microsoft",
    tier: "W" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/github.svg",
    context_limit: 128000,
  },
  {
    id: "deepseek",
    name: "DeepSeek (Web)",
    vendor: "DeepSeek",
    tier: "W" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/deepseek.svg",
    context_limit: 64000,
  },
  {
    id: "huggingchat",
    name: "HuggingChat",
    vendor: "Hugging Face",
    tier: "W" as const,
    logo: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/huggingface.svg",
    context_limit: 32000,
  },
];

// Slice colors for consistent display
const SLICE_ACCENTS: Record<string, string> = {
  auth: "#f97316",
  data: "#38bdf8",
  ui: "#c084fc",
  api: "#22d3ee",
  core: "#6366f1",
  testing: "#22c55e",
  docs: "#facc15",
  config: "#ec4899",
};

// Supabase task row shape
interface VibePilotTask {
  id: string;
  title: string | null;
  status: string;
  priority: number;
  slice_id: string | null;
  phase: string | null;
  task_number: string | null;
  routing_flag: string;
  routing_flag_reason: string | null;
  assigned_to: string | null;
  dependencies: string[] | null;
  result: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// Supabase task_runs row shape
interface VibePilotTaskRun {
  id: string;
  task_id: string;
  model_id: string | null;
  platform: string | null;
  courier: string | null;
  status: string;
  tokens_used: number | null;
  started_at: string;
  completed_at: string | null;
}

/**
 * Map VibePilot status to Dashboard TaskStatus
 */
function mapTaskStatus(status: string): TaskSnapshot["status"] {
  const statusMap: Record<string, TaskSnapshot["status"]> = {
    pending: "assigned",
    available: "assigned",
    in_progress: "in_progress",
    review: "supervisor_review",
    testing: "testing",
    approval: "supervisor_approval",
    merged: "complete",
    failed: "blocked",
    escalated: "blocked",
  };
  return statusMap[status] || "assigned";
}

/**
 * Determine task location based on routing flag and assignment
 */
function deriveTaskLocation(
  routingFlag: string,
  assignedTo: string | null,
  platform: string | null
): TaskSnapshot["location"] {
  if (routingFlag === "internal") {
    return { kind: "internal", label: "VibePilot" };
  }
  if (routingFlag === "mcp") {
    return { kind: "mcp", label: "MCP Gateway" };
  }
  // Web courier
  if (platform) {
    const platformInfo = VIBEPILOT_PLATFORMS.find((p) => p.id === platform);
    return { kind: "platform", label: platformInfo?.name || platform };
  }
  return { kind: "platform", label: "Web" };
}

/**
 * Transform VibePilot tasks + runs to Dashboard TaskSnapshot[]
 */
export function transformTasks(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[]
): TaskSnapshot[] {
  // Build run lookup by task_id (most recent)
  const latestRunByTask = new Map<string, VibePilotTaskRun>();
  for (const run of runs) {
    const existing = latestRunByTask.get(run.task_id);
    if (!existing || new Date(run.started_at) > new Date(existing.started_at)) {
      latestRunByTask.set(run.task_id, run);
    }
  }

  return tasks.map((task) => {
    const run = latestRunByTask.get(task.id);
    const runtimeSeconds = run?.started_at && run?.completed_at
      ? Math.round(
          (new Date(run.completed_at).getTime() -
            new Date(run.started_at).getTime()) /
            1000
        )
      : undefined;

    return {
      id: task.id,
      title: task.title || "Untitled Task",
      status: mapTaskStatus(task.status),
      confidence: 0.85, // Default - could be stored in task
      updatedAt: task.updated_at,
      owner: task.assigned_to ? `agent.${task.assigned_to}` : null,
      sliceId: task.slice_id ? `slice.${task.slice_id}` : undefined,
      taskNumber: task.task_number || undefined,
      location: deriveTaskLocation(
        task.routing_flag,
        task.assigned_to,
        run?.platform || null
      ),
      dependencies: task.dependencies || [],
      summary: task.routing_flag_reason || undefined,
      metrics: {
        tokensUsed: run?.tokens_used || 0,
        runtimeSeconds,
        costUsd: 0, // Would need pricing data
      },
    };
  });
}

/**
 * Build AgentSnapshot[] from models + platforms
 */
export function transformAgents(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[]
): AgentSnapshot[] {
  // Build assignment counts
  const assignmentsByModel = new Map<string, { active: number; total: number }>();
  
  for (const task of tasks) {
    if (task.assigned_to) {
      const stats = assignmentsByModel.get(task.assigned_to) || { active: 0, total: 0 };
      stats.total += 1;
      if (["in_progress", "review", "testing"].includes(task.status)) {
        stats.active += 1;
      }
      assignmentsByModel.set(task.assigned_to, stats);
    }
  }

  // Combine models + platforms as agents
  const agents: AgentSnapshot[] = [];

  // Add internal models
  for (const model of VIBEPILOT_MODELS) {
    const stats = assignmentsByModel.get(model.id) || { active: 0, total: 0 };
    agents.push({
      id: `agent.${model.id}`,
      name: model.name,
      status: stats.active > 0 ? "in_progress" : "idle",
      summary: stats.active > 0 ? `Working on ${stats.active} task(s)` : "Available",
      updatedAt: new Date().toISOString(),
      logo: model.logo,
      tier: model.tier,
      vendor: model.vendor,
      contextWindowTokens: model.context_limit,
      effectiveContextWindowTokens: Math.round(model.context_limit * 0.75),
      creditStatus: "available",
      warnings: [],
    });
  }

  // Add web platforms
  for (const platform of VIBEPILOT_PLATFORMS) {
    agents.push({
      id: `agent.${platform.id}`,
      name: platform.name,
      status: "idle",
      summary: "Web courier platform",
      updatedAt: new Date().toISOString(),
      logo: platform.logo,
      tier: platform.tier,
      vendor: platform.vendor,
      contextWindowTokens: platform.context_limit,
      effectiveContextWindowTokens: Math.round(platform.context_limit * 0.75),
      creditStatus: "available",
      warnings: [],
    });
  }

  return agents;
}

/**
 * Build SliceCatalog[] from tasks grouped by slice_id
 */
export function transformSlices(tasks: VibePilotTask[]): SliceCatalog[] {
  const sliceMap = new Map<
    string,
    { total: number; done: number; tokens: number }
  >();

  for (const task of tasks) {
    const sliceId = task.slice_id || "general";
    const stats = sliceMap.get(sliceId) || { total: 0, done: 0, tokens: 0 };
    stats.total += 1;
    if (task.status === "merged") {
      stats.done += 1;
    }
    sliceMap.set(sliceId, stats);
  }

  return Array.from(sliceMap.entries()).map(([sliceId, stats]) => ({
    id: `slice.${sliceId}`,
    name: sliceId.charAt(0).toUpperCase() + sliceId.slice(1),
    tasksTotal: stats.total,
    tasksDone: stats.done,
    tokens: stats.tokens,
    accent: SLICE_ACCENTS[sliceId] || "#94a3b8",
  }));
}

/**
 * Calculate aggregate metrics
 */
export function calculateMetrics(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[]
): { tokens_used: number; active_tasks: number } {
  const tokensUsed = runs.reduce(
    (sum, run) => sum + (run.tokens_used || 0),
    0
  );
  const activeTasks = tasks.filter((t) =>
    ["in_progress", "review", "testing"].includes(t.status)
  ).length;

  return {
    tokens_used: tokensUsed,
    active_tasks: activeTasks,
  };
}

/**
 * Full adapter: Transform Supabase data to Dashboard shape
 */
export interface DashboardData {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  slices: SliceCatalog[];
  metrics: { tokens_used: number; active_tasks: number };
  updated_at: string;
}

export function adaptVibePilotToDashboard(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[]
): DashboardData {
  return {
    tasks: transformTasks(tasks, runs),
    agents: transformAgents(tasks, runs),
    slices: transformSlices(tasks),
    metrics: calculateMetrics(tasks, runs),
    updated_at: new Date().toISOString(),
  };
}
