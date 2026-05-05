/**
 * VibePilot Supabase Adapter
 *
 * Transforms VibePilot's Supabase data to Vibeflow Dashboard shape.
 * Falls back to mock data if Supabase not configured.
 * 
 * NO HARDCODED DATA - all models/platforms come from Supabase.
 */

import { AgentSnapshot, TaskSnapshot } from "@core/types";
import { SliceCatalog } from "../utils/mission";

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
  general: "#94a3b8",
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
  confidence: number | null;
  category: string | null;
  plan_id: string | null;
  total_tokens_in: number | null;
  total_tokens_out: number | null;
  total_cost_usd: number | null;
  total_api_cost_usd: number | null;
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
  tokens_in: number | null;
  tokens_out: number | null;
  courier_model_id: string | null;
  courier_tokens: number | null;
  courier_cost_usd: number | null;
  platform_theoretical_cost_usd: number | null;
  total_actual_cost_usd: number | null;
  total_savings_usd: number | null;
  started_at: string;
  completed_at: string | null;
}

// Supabase models row shape
interface VibePilotModel {
  id: string;
  name: string | null;
  vendor: string | null;
  access_type: string;
  context_limit: number | null;
  status: string;
  status_reason: string | null;
  logo_url: string | null;
  tokens_used: number | null;
  tasks_completed: number | null;
  tasks_failed: number | null;
  success_rate: number | null;
  cooldown_expires_at: string | null;
  config: Record<string, unknown> | null;
  subscription_cost_usd: number | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  subscription_status: string | null;
  cost_input_per_1k_usd: number | null;
  cost_output_per_1k_usd: number | null;
}

// Supabase platforms row shape
interface VibePilotPlatform {
  id: string;
  name: string | null;
  vendor: string | null;
  type: string;
  context_limit: number | null;
  status: string;
  logo_url: string | null;
  theoretical_cost_input_per_1k_usd: number | null;
  theoretical_cost_output_per_1k_usd: number | null;
  config: {
    name?: string;
    provider?: string;
    free_tier?: {
      model?: string;
      rate_limits?: {
        requests_per_minute?: number;
        requests_per_day?: number;
        messages_per_hour?: number;
      };
      context_limit?: number;
    };
    capabilities?: string[];
    strengths?: string[];
    notes?: string;
  } | null;
}

/**
 * Map VibePilot status to Dashboard TaskStatus
 */
function mapTaskStatus(status: string): TaskSnapshot["status"] {
  const statusMap: Record<string, TaskSnapshot["status"]> = {
    pending: "pending",
    available: "pending",
    in_progress: "in_progress",
    review: "review",
    testing: "testing",
    awaiting_human: "failed",
    human_review: "human_review",
    merged: "merged",
    complete: "complete",
    merge_pending: "merge_pending",
    failed: "failed",
    escalated: "failed",
  };
  return statusMap[status] || "pending";
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
    return { kind: "platform", label: platform };
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
  // Also build total tokens across ALL runs per task (including plan-stage runs)
  const tokensByTask = new Map<string, number>();

  // Build a map: plan_id -> task_id so plan-stage runs (planner, plan_reviewer)
  // get attributed to the task that came from that plan
  const planToTask = new Map<string, string>();
  for (const task of tasks) {
    if (task.plan_id) planToTask.set(task.plan_id, task.id);
  }

  for (const run of runs) {
    // Resolve run's task_id: if it's a plan ID, map to actual task
    let effectiveTaskId = run.task_id;
    if (planToTask.has(run.task_id)) {
      effectiveTaskId = planToTask.get(run.task_id)!;
    }
    // Skip orphaned plan-stage runs with no matching task
    if (!tasks.some(t => t.id === effectiveTaskId)) continue;

    const existing = latestRunByTask.get(effectiveTaskId);
    if (!existing || new Date(run.started_at) > new Date(existing.started_at)) {
      latestRunByTask.set(effectiveTaskId, run);
    }
    const tok = run.tokens_used ?? (run.tokens_in ?? 0) + (run.tokens_out ?? 0);
    tokensByTask.set(effectiveTaskId, (tokensByTask.get(effectiveTaskId) ?? 0) + tok);
  }

  return tasks.map((task) => {
    const run = latestRunByTask.get(task.id);
    const runtimeSeconds =
      run?.started_at && run?.completed_at
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
      confidence: task.confidence ?? 0.85,
      updatedAt: task.updated_at,
      owner: task.assigned_to
        ? task.assigned_to
        : null,
      sliceId: task.slice_id ? `slice.${task.slice_id}` : undefined,
      taskNumber: task.task_number || undefined,
      location: deriveTaskLocation(
        task.routing_flag,
        task.assigned_to,
        run?.platform || null
      ),
      dependencies: task.dependencies || [],
      summary: task.routing_flag_reason || undefined,
      packet: task.result?.prompt_packet
        ? { prompt: String(task.result.prompt_packet) }
        : undefined,
      mergePending: task.status === "merge_pending",
      metrics: {
        tokensUsed: tokensByTask.get(task.id) ?? (run?.tokens_used ?? ((run?.tokens_in ?? 0) + (run?.tokens_out ?? 0))) ?? 0,
        runtimeSeconds,
        costUsd: 0,
      },
    };
  });
}

/**
 * Build AgentSnapshot[] from Supabase models + platforms
 * NO HARDCODING - queries live data
 */
export function transformAgents(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[],
  models: VibePilotModel[],
  platforms: VibePilotPlatform[]
): AgentSnapshot[] {
  // Build assignment counts
  const assignmentsByModel = new Map<string, { active: number; total: number }>();

  for (const task of tasks) {
    if (task.assigned_to) {
      const stats = assignmentsByModel.get(task.assigned_to) || {
        active: 0,
        total: 0,
      };
      stats.total += 1;
      if (["in_progress", "review", "testing"].includes(task.status)) {
        stats.active += 1;
      }
      assignmentsByModel.set(task.assigned_to, stats);
    }
  }

  const agents: AgentSnapshot[] = [];

  // Add internal models (Q tier)
  for (const model of models) {
    // Skip only truly nonexistent entries. All statuses render.
    // active=Ready/Active, paused=Credit/Cooldown/Issue, benched=Issue
    if (model.status === "deleted") continue;

    const stats = assignmentsByModel.get(model.id) || { active: 0, total: 0 };
    const tier =
      model.access_type === "web" ? "W" : model.access_type === "mcp" ? "M" : "Q";

    const statusReason = (model.status_reason || "").toLowerCase();
    const isActive = model.status === "active";
    const inCooldown = model.status === "paused" && !!model.cooldown_expires_at;
    const needsCredit = model.status === "paused" && statusReason.includes("credit");
    const cooldownExpiresAt = model.cooldown_expires_at || undefined;
    
    let agentStatus: AgentSnapshot["status"] = "idle";
    let displaySummary: string = "Available";
    
    if (needsCredit) {
      agentStatus = "credit_needed";
      displaySummary = "Credit needed - flagged for review";
    } else if (inCooldown) {
      agentStatus = "cooldown";
      displaySummary = model.status_reason || "In cooldown";
    } else if (!isActive) {
      // All non-active, non-credit, non-cooldown = Issue
      agentStatus = "blocked";
      displaySummary = model.status_reason || "Not available";
    } else if (stats.active > 0) {
      agentStatus = "in_progress";
      displaySummary = `Working on ${stats.active} task(s)`;
    }

    agents.push({
      id: `agent.${model.id}`,
      name: model.name || model.id,
      status: agentStatus,
      summary: displaySummary,
      updatedAt: new Date().toISOString(),
      logo: model.logo_url || undefined,
      tier,
      vendor: model.vendor || undefined,
      contextWindowTokens: model.context_limit || undefined,
      effectiveContextWindowTokens: model.context_limit
        ? Math.round(model.context_limit * 0.75)
        : undefined,
      creditStatus: needsCredit ? "depleted" : inCooldown ? "unknown" : "available",
      cooldownExpiresAt: needsCredit ? undefined : cooldownExpiresAt,
      cooldownReason: needsCredit ? undefined : (inCooldown ? model.status_reason || undefined : undefined),
      warnings: needsCredit 
        ? ["Add credit to resume"] 
        : inCooldown 
          ? [model.status_reason || "Cooldown active"] 
          : [],
    });
  }

  // NOTE: Platforms are DESTINATIONS (where couriers go), not models.
  // They should NOT render as model cards. W-tier models in the models table
  // already represent what's available on each platform.
  // Platform data is still available in the return for future routing UI.

  return agents;
}

/**
 * Build SliceCatalog[] from tasks grouped by slice_id
 */
export function transformSlices(tasks: VibePilotTask[]): SliceCatalog[] {
  const sliceMap = new Map<string, { total: number; done: number; tokens: number; mergePending: number }>();

  for (const task of tasks) {
    const sliceId = task.slice_id || "general";
    const stats = sliceMap.get(sliceId) || { total: 0, done: 0, tokens: 0, mergePending: 0 };
    stats.total += 1;
    if (task.status === "merged") {
      stats.done += 1;
    }
    if (task.status === "merge_pending") {
      stats.mergePending += 1;
    }
    sliceMap.set(sliceId, stats);
  }

  return Array.from(sliceMap.entries()).map(([sliceId, stats]) => ({
    id: `slice.${sliceId}`,
    name: sliceId.charAt(0).toUpperCase() + sliceId.slice(1),
    tasksTotal: stats.total,
    tasksDone: stats.done,
    tokens: stats.tokens,
    mergePending: stats.mergePending,
    accent: SLICE_ACCENTS[sliceId] || "#94a3b8",
  }));
}

/**
 * ROI Types
 */
export interface SliceROI {
  slice_id: string;
  slice_name: string;
  total_tasks: number;
  completed_tasks: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_courier_tokens: number;
  theoretical_cost_usd: number;
  actual_cost_usd: number;
  savings_usd: number;
  completion_pct: number;
}

export interface SubscriptionROI {
  model_id: string;
  model_name: string | null;
  subscription_cost_usd: number | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  subscription_status: string | null;
  days_used: number;
  days_total: number;
  days_remaining: number;
  prorated_cost_usd: number;
  tasks_completed: number;
  tasks_failed: number;
  tokens_used: number;
  cost_per_task: number;
  success_rate: number;
  recommendation: string;
  api_equivalent_cost_usd: number;
  roi_percentage: number;
}

export interface ProjectROI {
  project_id: string;
  project_name: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  completion_rate: number;
  total_tokens: number;
  total_theoretical_cost_usd: number;
  total_actual_cost_usd: number;
  total_savings_usd: number;
  roi_percentage: number;
  avg_tokens_per_task: number;
}

export interface ROITotals {
  total_tokens: number;
  total_theoretical_usd: number;
  total_actual_usd: number;
  total_savings_usd: number;
  total_tasks: number;
  total_completed: number;
}

export interface FullROIReport {
  generated_at: string;
  totals: ROITotals;
  projects: ProjectROI[];
  slices: SliceROI[];
  models: ModelROI[];
  subscriptions: SubscriptionROI[];
}

export interface ModelROI {
  model_id: string;
  model_name: string | null;
  role: "executor" | "courier" | "both";
  total_runs: number;
  successful_runs: number;
  total_tokens_in: number;
  total_tokens_out: number;
  total_courier_tokens: number;
  theoretical_cost_usd: number;
  actual_cost_usd: number;
  savings_usd: number;
  tasks: TaskRunROI[];
}

export interface TaskRunROI {
  task_id: string;
  task_title: string;
  slice_id: string | null;
  run_id: string;
  tokens_in: number;
  tokens_out: number;
  courier_tokens: number;
  theoretical_cost_usd: number;
  actual_cost_usd: number;
  savings_usd: number;
  status: string;
  started_at: string;
  completed_at: string | null;
}

/**
 * Project Cost — real-world expense tracking for ROI overhead
 */
export interface ProjectCost {
  id: string;
  category: string;
  description: string;
  amount_usd: number;
  frequency: "one_time" | "monthly" | "quarterly" | "annual";
  incurred_at: string;
  created_at: string;
  archived_at: string | null;
}

/**
 * Calculate ROI from task runs
 */
export function calculateROI(
  runs: VibePilotTaskRun[]
): {
  total_tokens_in: number;
  total_tokens_out: number;
  total_courier_tokens: number;
  total_theoretical_usd: number;
  total_actual_usd: number;
  total_savings_usd: number;
} {
  return runs.reduce(
    (acc, run) => ({
      total_tokens_in: acc.total_tokens_in + (run.tokens_in || 0),
      total_tokens_out: acc.total_tokens_out + (run.tokens_out || 0),
      total_courier_tokens: acc.total_courier_tokens + (run.courier_tokens || 0),
      total_theoretical_usd: acc.total_theoretical_usd + (run.platform_theoretical_cost_usd || 0),
      total_actual_usd: acc.total_actual_usd + (run.total_actual_cost_usd || 0),
      total_savings_usd: acc.total_savings_usd + (run.total_savings_usd || 0),
    }),
    {
      total_tokens_in: 0,
      total_tokens_out: 0,
      total_courier_tokens: 0,
      total_theoretical_usd: 0,
      total_actual_usd: 0,
      total_savings_usd: 0,
    }
  );
}

/**
 * Calculate slice-level ROI from tasks and runs
 */
export function calculateSliceROI(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[]
): SliceROI[] {
  const sliceMap = new Map<string, {
    taskIds: Set<string>;
    completed: number;
    runs: VibePilotTaskRun[];
  }>();

  for (const task of tasks) {
    const sliceId = task.slice_id || "general";
    const entry = sliceMap.get(sliceId) || { taskIds: new Set(), completed: 0, runs: [] };
    entry.taskIds.add(task.id);
    if (task.status === "merged") {
      entry.completed += 1;
    }
    sliceMap.set(sliceId, entry);
  }

  for (const run of runs) {
    const task = tasks.find(t => t.id === run.task_id);
    const sliceId = task?.slice_id || "general";
    const entry = sliceMap.get(sliceId);
    if (entry) {
      entry.runs.push(run);
    }
  }

  return Array.from(sliceMap.entries()).map(([sliceId, data]) => {
    const roi = calculateROI(data.runs);
    const totalTasks = data.taskIds.size;
    return {
      slice_id: sliceId,
      slice_name: sliceId.charAt(0).toUpperCase() + sliceId.slice(1),
      total_tasks: totalTasks,
      completed_tasks: data.completed,
      total_tokens_in: roi.total_tokens_in,
      total_tokens_out: roi.total_tokens_out,
      total_courier_tokens: roi.total_courier_tokens,
      theoretical_cost_usd: roi.total_theoretical_usd,
      actual_cost_usd: roi.total_actual_usd,
      savings_usd: roi.total_savings_usd,
      completion_pct: totalTasks > 0 ? Math.round((data.completed / totalTasks) * 100 * 10) / 10 : 0,
    };
  });
}

/**
 * Calculate subscription ROI for active subscriptions
 */
export function calculateSubscriptionROI(
  models: VibePilotModel[],
  subscriptionHistory?: { model_id: string; tokens_consumed: number; tasks_completed: number; api_equivalent_cost_usd?: number; roi_percentage?: number; cost_usd?: number; started_at?: string; ended_at?: string; period_type?: string }[]
): SubscriptionROI[] {
  // Build lookup from subscription_history for real token/task/cost counts
  const historyByModel = new Map<string, { tokens: number; tasks: number; apiEquivCost: number; roiPct: number; costUsd: number; startedAt: string; endedAt: string; periodType: string }>();
  if (subscriptionHistory) {
    for (const h of subscriptionHistory) {
      const existing = historyByModel.get(h.model_id) || { tokens: 0, tasks: 0, apiEquivCost: 0, roiPct: 0, costUsd: 0, startedAt: "", endedAt: "", periodType: "" };
      existing.tokens += h.tokens_consumed || 0;
      existing.tasks += h.tasks_completed || 0;
      existing.apiEquivCost += h.api_equivalent_cost_usd || 0;
      existing.roiPct = Math.max(existing.roiPct, h.roi_percentage || 0);
      // Use the LATEST (highest cost_usd) history entry for cost
      if ((h.cost_usd || 0) > 0 || !existing.periodType) {
        existing.costUsd = h.cost_usd || 0;
        existing.startedAt = h.started_at || "";
        existing.endedAt = h.ended_at || "";
        existing.periodType = h.period_type || "";
      }
      historyByModel.set(h.model_id, existing);
    }
  }

  return models
    .filter(m => m.subscription_status === "active")
    .map(model => {
      const historyData = historyByModel.get(model.id);
      const now = new Date();
      // Use history dates if model dates are missing
      const startDate = model.subscription_started_at ? new Date(model.subscription_started_at) : (historyData?.startedAt ? new Date(historyData.startedAt) : now);
      const endDate = model.subscription_ends_at ? new Date(model.subscription_ends_at) : (historyData?.endedAt ? new Date(historyData.endedAt) : now);
      
      const daysTotal = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysUsed = Math.min(daysTotal, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysRemaining = Math.max(0, daysTotal - daysUsed);
      
      // Use history cost (accurate) over model field (can be stale)
      const actualCost = historyData?.costUsd ?? (model.subscription_cost_usd || 0);
      const proratedCost = actualCost * (daysUsed / daysTotal);
      const tasksCompleted = historyData?.tasks || model.tasks_completed || 0;
      const tokensUsed = historyData?.tokens || model.tokens_used || 0;
      const costPerTask = tasksCompleted > 0 ? proratedCost / tasksCompleted : 0;
      
      let recommendation = "evaluate";
      if (endDate < now) {
        recommendation = "expired";
      } else if (daysRemaining <= 7) {
        recommendation = "renew_soon";
      } else if (tasksCompleted > 0 && costPerTask < (model.cost_input_per_1k_usd || 0) * 10) {
        recommendation = "good_value_renew";
      }
      
      return {
        model_id: model.id,
        model_name: model.name,
        subscription_cost_usd: actualCost,
        subscription_started_at: startDate.toISOString(),
        subscription_ends_at: endDate.toISOString(),
        subscription_status: model.subscription_status,
        days_used: daysUsed,
        days_total: daysTotal,
        days_remaining: daysRemaining,
        prorated_cost_usd: Math.round(proratedCost * 100) / 100,
        tasks_completed: tasksCompleted,
        tasks_failed: model.tasks_failed || 0,
        tokens_used: tokensUsed,
        cost_per_task: Math.round(costPerTask * 10000) / 10000,
        success_rate: model.success_rate || 0,
        recommendation,
        api_equivalent_cost_usd: historyData?.apiEquivCost || 0,
        roi_percentage: historyData?.roiPct || 0,
      };
    });
}

/**
 * Calculate model-level ROI from task runs
 * A model can be an executor (model_id) or a courier (courier_model_id)
 */
export function calculateModelROI(
  runs: VibePilotTaskRun[],
  models: VibePilotModel[],
  tasks: VibePilotTask[]
): ModelROI[] {
  const modelMap = new Map<string, {
    executorRuns: VibePilotTaskRun[];
    courierRuns: VibePilotTaskRun[];
  }>();

  // Group runs by model (both as executor and courier)
  for (const run of runs) {
    if (run.model_id) {
      const entry = modelMap.get(run.model_id) || { executorRuns: [], courierRuns: [] };
      entry.executorRuns.push(run);
      modelMap.set(run.model_id, entry);
    }
    if (run.courier_model_id && run.courier_model_id !== run.model_id) {
      const entry = modelMap.get(run.courier_model_id) || { executorRuns: [], courierRuns: [] };
      entry.courierRuns.push(run);
      modelMap.set(run.courier_model_id, entry);
    }
  }

  const results: ModelROI[] = [];

  for (const [modelId, data] of modelMap.entries()) {
    const model = models.find(m => m.id === modelId);
    const allRuns = [...data.executorRuns, ...data.courierRuns];
    const uniqueRuns = new Set(allRuns.map(r => r.id));

    // Determine role
    const role: "executor" | "courier" | "both" = 
      data.executorRuns.length > 0 && data.courierRuns.length > 0 ? "both" :
      data.courierRuns.length > 0 ? "courier" : "executor";

    // Calculate totals
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalCourierTokens = 0;
    let theoreticalCost = 0;
    let actualCost = 0;
    let savings = 0;
    let successfulRuns = 0;

    const taskRuns: TaskRunROI[] = [];

    for (const run of allRuns) {
      const task = tasks.find(t => t.id === run.task_id);
      const isExecutor = run.model_id === modelId;
      const isCourier = run.courier_model_id === modelId;

      // As executor: count platform tokens and theoretical cost
      if (isExecutor) {
        totalTokensIn += run.tokens_in || 0;
        totalTokensOut += run.tokens_out || 0;
        theoreticalCost += run.platform_theoretical_cost_usd || 0;
      }

      // As courier: count courier tokens and actual cost
      if (isCourier) {
        totalCourierTokens += run.courier_tokens || 0;
        actualCost += run.courier_cost_usd || 0;
      }

      // Savings from this run (count once per unique run)
      if (isExecutor) {
        savings += run.total_savings_usd || 0;
      }

      if (run.status === "success") {
        successfulRuns++;
      }

      // Build task run entry (only once per run, prefer executor perspective)
      if (isExecutor && !taskRuns.find(tr => tr.run_id === run.id)) {
        taskRuns.push({
          task_id: run.task_id,
          task_title: task?.title || "Unknown",
          slice_id: task?.slice_id || null,
          run_id: run.id,
          tokens_in: run.tokens_in || 0,
          tokens_out: run.tokens_out || 0,
          courier_tokens: run.courier_tokens || 0,
          theoretical_cost_usd: run.platform_theoretical_cost_usd || 0,
          actual_cost_usd: run.total_actual_cost_usd || 0,
          savings_usd: run.total_savings_usd || 0,
          status: run.status,
          started_at: run.started_at,
          completed_at: run.completed_at,
        });
      }
    }

    results.push({
      model_id: modelId,
      model_name: model?.name || modelId,
      role,
      total_runs: uniqueRuns.size,
      successful_runs: successfulRuns,
      total_tokens_in: totalTokensIn,
      total_tokens_out: totalTokensOut,
      total_courier_tokens: totalCourierTokens,
      theoretical_cost_usd: Math.round(theoreticalCost * 10000) / 10000,
      actual_cost_usd: Math.round(actualCost * 10000) / 10000,
      savings_usd: Math.round(savings * 10000) / 10000,
      tasks: taskRuns.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
    });
  }

  return results.sort((a, b) => b.savings_usd - a.savings_usd);
}

/**
 * Calculate aggregate metrics
 */
export function calculateMetrics(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[]
): { tokens_used: number; active_tasks: number } {
  // Sum tokens from all task runs (pipeline usage)
  const runTokens = runs.reduce(
    (sum, run) => sum + (run.tokens_used || (run.tokens_in || 0) + (run.tokens_out || 0)),
    0
  );
  // Sum tokens from all tasks (includes subscription-level totals)
  const taskTokens = tasks.reduce(
    (sum, t) => sum + (t.total_tokens_in || 0) + (t.total_tokens_out || 0),
    0
  );
  const activeTasks = tasks.filter((t) =>
    ["in_progress", "review", "testing"].includes(t.status)
  ).length;

  return {
    tokens_used: Math.max(runTokens, taskTokens),
    active_tasks: activeTasks,
  };
}

/**
 * Full adapter: Transform Supabase data to Dashboard shape
 */
export interface SystemCounters {
  id: string;
  total_tokens: number;
  total_cost_usd: number;
  total_runs: number;
  updated_at: string;
}

export interface DashboardData {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  slices: SliceCatalog[];
  metrics: { tokens_used: number; active_tasks: number };
  roi: {
    totals: ROITotals;
    slices: SliceROI[];
    models: ModelROI[];
    subscriptions: SubscriptionROI[];
    tasks: TaskRunROI[];
  };
  system_counters: SystemCounters | null;
  project_costs: ProjectCost[];
  updated_at: string;
}

export function adaptVibePilotToDashboard(
  tasks: VibePilotTask[],
  runs: VibePilotTaskRun[],
  models: VibePilotModel[],
  platforms: VibePilotPlatform[],
  systemCounters?: SystemCounters[],
  projectCosts?: ProjectCost[],
  subscriptionHistory?: { model_id: string; tokens_consumed: number; tasks_completed: number }[]
): DashboardData {
  const roi = calculateROI(runs);
  const sliceROI = calculateSliceROI(tasks, runs);
  const subscriptionROI = calculateSubscriptionROI(models, subscriptionHistory);
  const modelROI = calculateModelROI(runs, models, tasks);
  
  // Build per-task ROI from runs
  const taskROI: TaskRunROI[] = runs.map(run => {
    const task = tasks.find(t => t.id === run.task_id);
    return {
      task_id: run.task_id,
      task_title: task?.title || "Unknown",
      slice_id: task?.phase || null,
      run_id: run.id,
      tokens_in: run.tokens_in || 0,
      tokens_out: run.tokens_out || 0,
      courier_tokens: run.courier_tokens || 0,
      theoretical_cost_usd: run.platform_theoretical_cost_usd || 0,
      actual_cost_usd: run.total_actual_cost_usd || 0,
      savings_usd: run.total_savings_usd || 0,
      status: run.status || "unknown",
      started_at: run.started_at || "",
      completed_at: run.completed_at || null,
    };
  });
  
  const completedTasks = tasks.filter(t => t.status === "merged").length;
  
  // Include subscription savings in totals (actual cost vs API equivalent)
  const subApiEquiv = subscriptionROI.reduce((sum, s) => sum + (s.api_equivalent_cost_usd || 0), 0);
  const subActual = subscriptionROI.reduce((sum, s) => sum + (s.prorated_cost_usd || 0), 0);
  const subSavings = subApiEquiv - subActual;
  const subTokens = subscriptionROI.reduce((sum, s) => sum + (s.tokens_used || 0), 0);

  return {
    tasks: transformTasks(tasks, runs),
    agents: transformAgents(tasks, runs, models, platforms),
    slices: transformSlices(tasks),
    metrics: calculateMetrics(tasks, runs),
    roi: {
      totals: {
        total_tokens: roi.total_tokens_in + roi.total_tokens_out + subTokens,
        total_theoretical_usd: roi.total_theoretical_usd + subApiEquiv,
        total_actual_usd: roi.total_actual_usd + subActual,
        total_savings_usd: roi.total_savings_usd + subSavings,
        total_tasks: tasks.length,
        total_completed: completedTasks,
      },
      slices: sliceROI,
      models: modelROI,
      subscriptions: subscriptionROI,
      tasks: taskROI,
    },
    system_counters: systemCounters?.[0] || null,
    project_costs: projectCosts || [],
    updated_at: new Date().toISOString(),
  };
}
