/**
 * VibePilot Supabase Adapter
 *
 * Transforms VibePilot's Supabase data to Vibeflow Dashboard shape.
 * Falls back to mock data if Supabase not configured.
 *
 * NO HARDCODED DATA - all models/platforms come from Supabase.
 */
// Slice colors for consistent display
const SLICE_ACCENTS = {
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
/**
 * Map VibePilot status to Dashboard TaskStatus
 */
function mapTaskStatus(status) {
    const statusMap = {
        pending: "pending",
        available: "pending",
        in_progress: "in_progress",
        review: "review",
        testing: "testing",
        awaiting_human: "failed",
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
function deriveTaskLocation(routingFlag, assignedTo, platform) {
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
export function transformTasks(tasks, runs) {
    // Build run lookup by task_id (most recent)
    const latestRunByTask = new Map();
    for (const run of runs) {
        const existing = latestRunByTask.get(run.task_id);
        if (!existing || new Date(run.started_at) > new Date(existing.started_at)) {
            latestRunByTask.set(run.task_id, run);
        }
    }
    return tasks.map((task) => {
        const run = latestRunByTask.get(task.id);
        const runtimeSeconds = run?.started_at && run?.completed_at
            ? Math.round((new Date(run.completed_at).getTime() -
                new Date(run.started_at).getTime()) /
                1000)
            : undefined;
        return {
            id: task.id,
            title: task.title || "Untitled Task",
            status: mapTaskStatus(task.status),
            confidence: task.confidence ?? 0.85,
            updatedAt: task.updated_at,
            owner: task.status === "merged"
                ? null
                : task.assigned_to
                    ? `agent.${task.assigned_to}`
                    : null,
            sliceId: task.slice_id ? `slice.${task.slice_id}` : undefined,
            taskNumber: task.task_number || undefined,
            location: deriveTaskLocation(task.routing_flag, task.assigned_to, run?.platform || null),
            dependencies: task.dependencies || [],
            summary: task.routing_flag_reason || undefined,
            packet: task.result?.prompt_packet
                ? { prompt: String(task.result.prompt_packet) }
                : undefined,
            mergePending: task.status === "approval",
            metrics: {
                tokensUsed: run?.tokens_used || 0,
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
export function transformAgents(tasks, runs, models, platforms) {
    // Build assignment counts
    const assignmentsByModel = new Map();
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
    const agents = [];
    // Add internal models (Q tier)
    for (const model of models) {
        // Skip only truly nonexistent entries. All statuses render.
        // active=Ready/Active, paused=Credit/Cooldown/Issue, benched=Issue
        if (model.status === "deleted")
            continue;
        const stats = assignmentsByModel.get(model.id) || { active: 0, total: 0 };
        const tier = model.access_type === "web" ? "W" : model.access_type === "mcp" ? "M" : "Q";
        const statusReason = (model.status_reason || "").toLowerCase();
        const isActive = model.status === "active";
        const inCooldown = model.status === "paused" && !!model.cooldown_expires_at;
        const needsCredit = model.status === "paused" && statusReason.includes("credit");
        const cooldownExpiresAt = model.cooldown_expires_at || undefined;
        let agentStatus = "idle";
        let displaySummary = "Available";
        if (needsCredit) {
            agentStatus = "credit_needed";
            displaySummary = "Credit needed - flagged for review";
        }
        else if (inCooldown) {
            agentStatus = "cooldown";
            displaySummary = model.status_reason || "In cooldown";
        }
        else if (!isActive) {
            // All non-active, non-credit, non-cooldown = Issue
            agentStatus = "blocked";
            displaySummary = model.status_reason || "Not available";
        }
        else if (stats.active > 0) {
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
export function transformSlices(tasks) {
    const sliceMap = new Map();
    for (const task of tasks) {
        const sliceId = task.slice_id || "general";
        const stats = sliceMap.get(sliceId) || { total: 0, done: 0, tokens: 0, mergePending: 0 };
        stats.total += 1;
        if (task.status === "merged") {
            stats.done += 1;
        }
        if (task.status === "approval") {
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
 * Calculate ROI from task runs
 */
export function calculateROI(runs) {
    return runs.reduce((acc, run) => ({
        total_tokens_in: acc.total_tokens_in + (run.tokens_in || 0),
        total_tokens_out: acc.total_tokens_out + (run.tokens_out || 0),
        total_courier_tokens: acc.total_courier_tokens + (run.courier_tokens || 0),
        total_theoretical_usd: acc.total_theoretical_usd + (run.platform_theoretical_cost_usd || 0),
        total_actual_usd: acc.total_actual_usd + (run.total_actual_cost_usd || 0),
        total_savings_usd: acc.total_savings_usd + (run.total_savings_usd || 0),
    }), {
        total_tokens_in: 0,
        total_tokens_out: 0,
        total_courier_tokens: 0,
        total_theoretical_usd: 0,
        total_actual_usd: 0,
        total_savings_usd: 0,
    });
}
/**
 * Calculate slice-level ROI from tasks and runs
 */
export function calculateSliceROI(tasks, runs) {
    const sliceMap = new Map();
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
export function calculateSubscriptionROI(models) {
    return models
        .filter(m => m.subscription_status === "active" && m.subscription_cost_usd)
        .map(model => {
        const now = new Date();
        const startDate = model.subscription_started_at ? new Date(model.subscription_started_at) : now;
        const endDate = model.subscription_ends_at ? new Date(model.subscription_ends_at) : now;
        const daysTotal = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const daysUsed = Math.min(daysTotal, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const daysRemaining = Math.max(0, daysTotal - daysUsed);
        const proratedCost = (model.subscription_cost_usd || 0) * (daysUsed / daysTotal);
        const tasksCompleted = model.tasks_completed || 0;
        const costPerTask = tasksCompleted > 0 ? proratedCost / tasksCompleted : 0;
        let recommendation = "evaluate";
        if (endDate < now) {
            recommendation = "expired";
        }
        else if (daysRemaining <= 7) {
            recommendation = "renew_soon";
        }
        else if (tasksCompleted > 0 && costPerTask < (model.cost_input_per_1k_usd || 0) * 10) {
            recommendation = "good_value_renew";
        }
        return {
            model_id: model.id,
            model_name: model.name,
            subscription_cost_usd: model.subscription_cost_usd,
            subscription_started_at: model.subscription_started_at,
            subscription_ends_at: model.subscription_ends_at,
            subscription_status: model.subscription_status,
            days_used: daysUsed,
            days_total: daysTotal,
            days_remaining: daysRemaining,
            prorated_cost_usd: Math.round(proratedCost * 100) / 100,
            tasks_completed: tasksCompleted,
            tasks_failed: model.tasks_failed || 0,
            tokens_used: model.tokens_used || 0,
            cost_per_task: Math.round(costPerTask * 10000) / 10000,
            success_rate: model.success_rate || 0,
            recommendation,
        };
    });
}
/**
 * Calculate model-level ROI from task runs
 * A model can be an executor (model_id) or a courier (courier_model_id)
 */
export function calculateModelROI(runs, models, tasks) {
    const modelMap = new Map();
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
    const results = [];
    for (const [modelId, data] of modelMap.entries()) {
        const model = models.find(m => m.id === modelId);
        const allRuns = [...data.executorRuns, ...data.courierRuns];
        const uniqueRuns = new Set(allRuns.map(r => r.id));
        // Determine role
        const role = data.executorRuns.length > 0 && data.courierRuns.length > 0 ? "both" :
            data.courierRuns.length > 0 ? "courier" : "executor";
        // Calculate totals
        let totalTokensIn = 0;
        let totalTokensOut = 0;
        let totalCourierTokens = 0;
        let theoreticalCost = 0;
        let actualCost = 0;
        let savings = 0;
        let successfulRuns = 0;
        const taskRuns = [];
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
export function calculateMetrics(tasks, runs) {
    const tokensUsed = runs.reduce((sum, run) => sum + (run.tokens_used || 0), 0);
    const activeTasks = tasks.filter((t) => ["in_progress", "review", "testing"].includes(t.status)).length;
    return {
        tokens_used: tokensUsed,
        active_tasks: activeTasks,
    };
}
export function adaptVibePilotToDashboard(tasks, runs, models, platforms, systemCounters) {
    const roi = calculateROI(runs);
    const sliceROI = calculateSliceROI(tasks, runs);
    const subscriptionROI = calculateSubscriptionROI(models);
    const modelROI = calculateModelROI(runs, models, tasks);
    // Build per-task ROI from runs
    const taskROI = runs.map(run => {
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
    return {
        tasks: transformTasks(tasks, runs),
        agents: transformAgents(tasks, runs, models, platforms),
        slices: transformSlices(tasks),
        metrics: calculateMetrics(tasks, runs),
        roi: {
            totals: {
                total_tokens: roi.total_tokens_in + roi.total_tokens_out,
                total_theoretical_usd: roi.total_theoretical_usd,
                total_actual_usd: roi.total_actual_usd,
                total_savings_usd: roi.total_savings_usd,
                total_tasks: tasks.length,
                total_completed: completedTasks,
            },
            slices: sliceROI,
            models: modelROI,
            subscriptions: subscriptionROI,
            tasks: taskROI,
        },
        system_counters: systemCounters?.[0] || null,
        updated_at: new Date().toISOString(),
    };
}
