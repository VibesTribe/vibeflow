import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildAgentSummaries, buildRecentTasks, calculateCooldownRemaining, collectAgentAssignments, formatStatusLabel, normalizeAgentStatus, } from "../../utils/mission";
import AdminControlCenter from "./AdminControlCenter";
const DOC_LINKS = [
    { label: "Product Requirements (PRD)", path: "/docs/overview.html" },
    { label: "System Plan", path: "/docs/system_plan_v5.html" },
    { label: "Runbook", path: "/docs/runbook.html" },
];
const ACTIVE_STATUSES = new Set(["in_progress", "received", "review", "testing"]);
const COMPLETED_STATUSES = new Set(["complete", "merged", "merge_pending"]);
const REVIEW_STATUSES = new Set(["review"]);
const PENDING_STATUSES = new Set(["pending", "failed"]);
const SLICE_FILTER_META = {
    complete: {
        label: "Complete",
        icon: "\u2713",
        tone: "complete",
        color: "#22c55e",
        match: (status) => COMPLETED_STATUSES.has(status),
    },
    active: {
        label: "Active",
        icon: "\u21BB",
        tone: "active",
        color: "#38bdf8",
        match: (status) => ACTIVE_STATUSES.has(status),
    },
    pending: {
        label: "Pending",
        icon: "\u23F3",
        tone: "pending",
        color: "#facc15",
        match: (status) => PENDING_STATUSES.has(status),
    },
    review: {
        label: "Review",
        icon: "\u{1F6A9}",
        tone: "review",
        color: "#ff3b6f",
        match: (status) => REVIEW_STATUSES.has(status),
    },
};
const ROUTING_EVENT_TYPES = new Set(["route", "routing_decision", "retry", "reroute", "validation"]);
const MissionModals = ({ modal, onClose, events, agents, slices, roi, onOpenReview, onSelectAgent, onShowModels }) => {
    const modalRef = useRef(null);
    useEffect(() => {
        modalRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }, [modal]);
    if (modal.type === null) {
        return null;
    }
    let content = null;
    switch (modal.type) {
        case "docs":
            content = _jsx(DocumentList, {});
            break;
        case "logs":
            content = _jsx(LogList, { events: events, slices: slices });
            break;
        case "roi":
            content = _jsx(RoiPanel, { agents: agents, slices: slices, roi: roi });
            break;
        case "models":
            content = _jsx(ModelOverview, { agents: agents, slices: slices, roi: roi, onSelectAgent: onSelectAgent });
            break;
        case "agent":
            content = _jsx(AgentDetails, { agent: modal.agent, events: events, slices: slices, roi: roi, onBackToModels: onShowModels });
            break;
        case "slice":
            content = _jsx(SliceDetails, { slice: modal.slice, events: events, onOpenReview: onOpenReview });
            break;
        case "assignment":
            content = _jsx(AssignmentDetails, { assignment: modal.assignment, slice: modal.slice, events: events });
            break;
        case "add":
            content = _jsx(AddAgentForm, { onClose: onClose });
            break;
        case "admin":
            content = _jsx(AdminControlCenter, {});
            break;
        default:
            content = null;
    }
    const canShowBackControl = modal.type === "agent" && typeof onShowModels === "function";
    const modalClasses = ["mission-modal"];
    if (modal.type === "models") {
        modalClasses.push("mission-modal--models");
    }
    if (modal.type === "admin") {
        modalClasses.push("mission-modal--admin");
    }
    return (_jsx("div", { className: "mission-modal__overlay", role: "dialog", "aria-modal": "true", children: _jsxs("div", { className: modalClasses.join(" "), ref: modalRef, children: [_jsxs("div", { className: "mission-modal__controls", children: [canShowBackControl && (_jsxs("button", { type: "button", className: "mission-modal__back", onClick: onShowModels, children: ["\u2190", " Back"] })), _jsx("button", { type: "button", className: "mission-modal__close", onClick: onClose, "aria-label": "Close", children: "\u00D7" })] }), content] }) }));
};
export default MissionModals;
const DocumentList = () => (_jsxs("div", { className: "mission-modal__section", children: [_jsx("h3", { children: "Project Docs" }), _jsx("ul", { className: "mission-list", children: DOC_LINKS.map((doc) => (_jsx("li", { children: _jsx("a", { href: doc.path, target: "_blank", rel: "noreferrer", className: "mission-link", children: doc.label }) }, doc.label))) })] }));
const LogList = ({ events, slices }) => {
    const [sourceFilter, setSourceFilter] = useState(null);
    // Build a lookup map: taskId → task title
    const taskTitles = useMemo(() => {
        const map = new Map();
        for (const slice of slices) {
            for (const task of slice.tasks ?? []) {
                if (task.id)
                    map.set(task.id, task.title ?? "");
                if (task.taskNumber)
                    map.set(task.taskNumber, task.title ?? "");
            }
        }
        return map;
    }, [slices]);
    const sources = useMemo(() => {
        const s = new Set();
        events.forEach(e => { if (e.details?.source)
            s.add(e.details.source); });
        return Array.from(s).sort();
    }, [events]);
    const filtered = sourceFilter
        ? events.filter(e => e.details?.source === sourceFilter)
        : events;
    return (_jsxs("div", { className: "mission-modal__section mission-modal__section--sticky", children: [_jsx("h3", { children: "Pipeline Timeline" }), sources.length > 1 && (_jsxs("div", { style: { display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }, children: [_jsx("button", { className: `mission-log__filter-btn ${!sourceFilter ? "active" : ""}`, onClick: () => setSourceFilter(null), style: {
                            padding: "2px 8px", fontSize: 11, borderRadius: 4,
                            border: `1px solid ${sourceFilter ? "#444" : "#646cff"}`,
                            background: sourceFilter ? "transparent" : "#646cff20",
                            color: sourceFilter ? "#999" : "#646cff",
                            cursor: "pointer",
                        }, children: "All" }), sources.map(s => (_jsx("button", { className: `mission-log__filter-btn ${sourceFilter === s ? "active" : ""}`, onClick: () => setSourceFilter(sourceFilter === s ? null : s), style: {
                            padding: "2px 8px", fontSize: 11, borderRadius: 4,
                            border: `1px solid ${sourceFilter === s ? "#646cff" : "#444"}`,
                            background: sourceFilter === s ? "#646cff20" : "transparent",
                            color: sourceFilter === s ? "#646cff" : "#999",
                            cursor: "pointer",
                        }, children: s }, s)))] })), _jsxs("ul", { className: "mission-log-list", children: [filtered.slice(0, 60).map((event) => {
                        const meta = getEventMeta(event);
                        const detailMessage = extractEventMessage(event);
                        const category = deriveLogCategory(event);
                        const source = event.details?.source;
                        const taskTitle = taskTitles.get(event.taskId) ?? "";
                        return (_jsxs("li", { children: [_jsx("span", { className: `mission-log__bullet mission-log__bullet--${category}` }), _jsxs("div", { className: "mission-log__entry", children: [_jsxs("div", { className: "mission-log__header", children: [_jsxs("strong", { children: [meta.icon, " ", meta.label, taskTitle ? ` — ${taskTitle}` : ""] }), _jsx("span", { children: new Date(event.timestamp).toLocaleString() }), source && _jsx("span", { className: "mission-log__category", style: { fontSize: 10, opacity: 0.7 }, children: source }), !source && _jsx("span", { className: "mission-log__category", children: formatLogCategory(category) })] }), detailMessage && _jsx("p", { children: detailMessage }), event.reasonCode && event.reasonCode !== detailMessage && (_jsx("p", { style: { fontSize: 11, opacity: 0.6, marginTop: 2 }, children: event.reasonCode }))] })] }, event.id));
                    }), filtered.length === 0 && _jsx("li", { children: "No events yet." })] })] }));
};
const MODEL_STATUS_LEGEND = [
    { key: "ready", label: "Ready", icon: "\u2713" },
    { key: "active", label: "Active", icon: "\u21BB" },
    { key: "cooldown", label: "Cooldown", icon: "\u23F3" },
    { key: "credit", label: "Credit Needed", icon: "\u{1F4B0}" },
    { key: "issue", label: "Issue", icon: "\u26A0" },
];
const MODEL_TIER_LEGEND = [
    { key: "web", label: "Web", icon: "W" },
    { key: "mcp", label: "MCP", icon: "M" },
    { key: "internal", label: "Internal", icon: "Q" },
];
const MODEL_STATUS_META = MODEL_STATUS_LEGEND.reduce((acc, item) => {
    acc[item.key] = { label: item.label, icon: item.icon };
    return acc;
}, {});
const ModelOverview = ({ agents, slices, roi, onSelectAgent, }) => {
    const [statusFilter, setStatusFilter] = useState(null);
    const [tierFilter, setTierFilter] = useState(null);
    const clearFilters = useCallback(() => {
        setStatusFilter(null);
        setTierFilter(null);
    }, []);
    const agentSummaries = useMemo(() => buildAgentSummaries(agents, slices), [agents, slices]);
    const toggleStatusFilter = useCallback((nextKey) => setStatusFilter((prev) => (prev === nextKey ? null : nextKey)), []);
    const toggleTierFilter = useCallback((nextTier) => setTierFilter((prev) => (prev === nextTier ? null : nextTier)), []);
    const hasFilters = statusFilter !== null || tierFilter !== null;
    const filteredSummaries = useMemo(() => {
        return agentSummaries.filter((summary) => {
            if (statusFilter && summary.statusKey !== statusFilter)
                return false;
            if (tierFilter && summary.agent.tierCategory !== tierFilter)
                return false;
            return true;
        });
    }, [agentSummaries, statusFilter, tierFilter]);
    return (_jsxs("div", { className: "mission-modal__section mission-modal__section--sticky model-panel", children: [_jsxs("header", { className: "model-panel__legend", children: [_jsx("div", { className: "model-panel__legend-row", children: MODEL_STATUS_LEGEND.map((item) => {
                            const isActive = statusFilter === item.key;
                            return (_jsxs("button", { type: "button", className: `status-dot status-dot--${item.key} ${isActive ? "is-active" : ""}`, onClick: () => toggleStatusFilter(item.key), "aria-pressed": isActive, children: [_jsx("span", { className: "status-dot__icon", children: item.icon }), item.label] }, item.key));
                        }) }), _jsxs("div", { className: "model-panel__legend-row model-panel__legend-row--badges", children: [MODEL_TIER_LEGEND.map((tier) => {
                                const isTierActive = tierFilter === tier.key;
                                return (_jsxs("button", { type: "button", className: `model-panel__legend-badge model-panel__legend-badge--${tier.key} ${isTierActive ? "is-active" : ""}`, onClick: () => toggleTierFilter(tier.key), "aria-pressed": isTierActive, children: [_jsx("span", { className: "model-panel__legend-badge-icon", children: tier.icon }), _jsx("span", { children: tier.label })] }, tier.key));
                            }), _jsxs("div", { className: "model-panel__legend-actions", children: [_jsx("button", { type: "button", className: "model-panel__action model-panel__action--primary", onClick: clearFilters, children: "View All" }), _jsx("button", { type: "button", className: "model-panel__action", onClick: clearFilters, disabled: !hasFilters, "aria-disabled": !hasFilters, children: "Clear Filters" })] })] })] }), _jsxs("ul", { className: "model-panel__list", children: [filteredSummaries.map((summary) => {
                        const contextTokens = summary.effectiveContextTokens ? formatTokenCount(summary.effectiveContextTokens) : null;
                        const cooldownLabel = summary.cooldownRemainingLabel ?? summary.agent.cooldownReason ?? "No cooldown";
                        const statusMeta = MODEL_STATUS_META[summary.statusKey] ?? MODEL_STATUS_META.ready;
                        // Look up ROI data for this model
                        const modelId = summary.agent.id.replace(/^agent\./, "");
                        const modelRoi = roi?.models?.find(m => m.model_id === modelId);
                        return (_jsxs("li", { className: `model-panel__item model-panel__item--${summary.statusKey}`, children: [_jsxs("div", { className: "model-panel__header", children: [_jsxs("div", { className: "model-panel__identity", children: [summary.agent.icon && (_jsx("img", { src: summary.agent.icon, alt: `${summary.agent.name} logo`, className: "model-panel__logo" })), _jsxs("div", { children: [_jsx("strong", { children: summary.agent.name }), summary.agent.vendor && _jsx("span", { className: "model-panel__vendor", children: summary.agent.vendor })] })] }), onSelectAgent && (_jsx("button", { type: "button", className: "model-panel__detail", onClick: () => onSelectAgent(summary.agent), children: "Details" }))] }), _jsxs("div", { className: "model-panel__status-line", children: [_jsx("button", { type: "button", className: `model-panel__tier-toggle ${tierFilter === summary.agent.tierCategory ? "is-active" : ""}`, onClick: () => toggleTierFilter(summary.agent.tierCategory), "aria-label": `Filter ${summary.agent.tierCategory} agents`, "aria-pressed": tierFilter === summary.agent.tierCategory, children: _jsx("span", { className: `agent-pill__tier agent-pill__tier--${summary.agent.tier.toLowerCase()}`, children: summary.agent.tier }) }), _jsxs("span", { className: `status-dot status-dot--${summary.statusKey}`, children: [_jsx("span", { className: "status-dot__icon", children: statusMeta?.icon }), statusMeta?.label] }), summary.primaryTask && (_jsxs("span", { className: "model-panel__working", children: ["Working on ", summary.primaryTask.taskNumber ?? summary.primaryTask.title] }))] }), _jsxs("div", { className: "model-panel__metrics", children: [_jsxs("div", { className: "model-panel__stats-row", children: [_jsxs("span", { className: "model-panel__stat model-panel__stat--assigned", children: ["Assigned ", _jsx("strong", { children: summary.assigned })] }), _jsxs("span", { className: "model-panel__stat model-panel__stat--success", children: ["Succeeded ", _jsx("strong", { children: summary.succeeded })] }), _jsxs("span", { className: "model-panel__stat model-panel__stat--failed", children: ["Failed ", _jsx("strong", { children: summary.failed })] }), _jsxs("span", { className: `model-panel__success model-panel__success--${summary.statusKey}`, children: ["Success ", summary.successRate, "%"] })] }), _jsxs("p", { className: "model-panel__context", children: ["Effective Context: ", contextTokens ? `${contextTokens} tokens` : "Unknown"] }), _jsxs("p", { className: "model-panel__cooldown", children: ["Cooldown: ", cooldownLabel] }), _jsxs("p", { className: "model-panel__foot", children: ["Tokens used: ", summary.tokensUsed.toLocaleString(), " \u2022 Avg response: ", summary.avgRuntime, "s", modelRoi && (_jsxs("span", { className: "model-panel__roi", children: [" ", "\u2022 Cost: $", modelRoi.actual_cost_usd.toFixed(4), " \u2022 Saved: $", modelRoi.savings_usd.toFixed(4)] }))] }), _jsxs("div", { className: "model-panel__meta", children: [summary.agent.rateLimitWindowSeconds !== undefined && (_jsxs("span", { children: ["Rate limit: ", summary.agent.rateLimitWindowSeconds ? `${summary.agent.rateLimitWindowSeconds}s` : "n/a"] })), summary.tokensToday > 0 && _jsxs("span", { children: ["Tokens today: ", formatTokenCount(summary.tokensToday)] }), summary.agent.costPer1kTokensUsd !== undefined && (_jsxs("span", { children: ["Cost / 1k: ", summary.agent.costPer1kTokensUsd ? `$${summary.agent.costPer1kTokensUsd.toFixed(2)}` : "n/a"] }))] })] }), _jsxs("div", { className: "model-panel__recent-activity", children: [_jsx("p", { children: "Recent Activity" }), _jsx("ul", { children: summary.recentTasks.length > 0 ? (summary.recentTasks.map((task) => (_jsxs("li", { className: `model-panel__recent-item model-panel__recent-item--${task.outcome}`, children: [_jsx("span", { children: task.taskNumber ?? task.title }), _jsx("span", { children: task.sliceName ?? "Slice" }), _jsx("span", { children: task.runtimeSeconds ? `${task.runtimeSeconds}s` : "n/a" })] }, task.id)))) : (_jsx("li", { className: "model-panel__recent-item model-panel__recent-item--empty", children: "No activity logged." })) })] }), summary.agent.cooldownReason && _jsx("p", { className: "model-panel__hint", children: summary.agent.cooldownReason })] }, summary.agent.id));
                    }), agentSummaries.length === 0 && _jsx("li", { className: "model-panel__empty", children: "No agents registered." })] })] }));
};
const RoiPanel = ({ agents, slices, roi }) => {
    const [showCad, setShowCad] = useState(false);
    const [exchangeRate, setExchangeRate] = useState(1.36);
    const [showSlices, setShowSlices] = useState(false);
    const [showModels, setShowModels] = useState(false);
    const [expandedSlice, setExpandedSlice] = useState(null);
    const [expandedModel, setExpandedModel] = useState(null);
    useEffect(() => {
        if (showCad) {
            import("../../lib/roiCalculator").then(({ fetchExchangeRate }) => {
                fetchExchangeRate().then((result) => setExchangeRate(result.rate));
            });
        }
    }, [showCad]);
    const formatUsd = (amount) => {
        const value = showCad ? amount * exchangeRate : amount;
        const currency = showCad ? "CAD" : "USD";
        const decimals = Math.abs(value) < 0.01 ? 6 : 2;
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(value);
    };
    const formatTokens = (tokens) => {
        if (tokens >= 1_000_000)
            return `${(tokens / 1_000_000).toFixed(1)}M`;
        if (tokens >= 1_000)
            return `${(tokens / 1_000).toFixed(1)}K`;
        return tokens.toString();
    };
    const totals = useMemo(() => {
        if (roi) {
            return {
                totalTokens: roi.totals.total_tokens,
                activeSlices: slices.filter((slice) => slice.active > 0).length,
                blockedSlices: slices.filter((slice) => slice.blocked > 0).length,
                completedSlices: slices.filter((slice) => slice.total > 0 && slice.completed >= slice.total).length,
                theoreticalCost: roi.totals.total_theoretical_usd,
                actualCost: roi.totals.total_actual_usd,
                savings: roi.totals.total_savings_usd,
                totalTasks: roi.totals.total_tasks,
                completedTasks: roi.totals.total_completed,
            };
        }
        const totalTokens = slices.reduce((sum, slice) => sum + (slice.tokens ?? 0), 0);
        const agentSpend = agents.reduce((sum, agent) => sum + (agent.costPerRunUsd ?? 0), 0);
        return {
            totalTokens,
            activeSlices: slices.filter((slice) => slice.active > 0).length,
            blockedSlices: slices.filter((slice) => slice.blocked > 0).length,
            completedSlices: slices.filter((slice) => slice.total > 0 && slice.completed >= slice.total).length,
            theoreticalCost: 0,
            actualCost: agentSpend,
            savings: 0,
            totalTasks: slices.reduce((sum, s) => sum + s.total, 0),
            completedTasks: slices.reduce((sum, s) => sum + s.completed, 0),
        };
    }, [agents, slices, roi]);
    const getRecommendationMeta = (rec) => {
        switch (rec) {
            case "expired":
                return { label: "Expired", color: "#ef4444" };
            case "renew_soon":
                return { label: "Renew Soon", color: "#f59e0b" };
            case "good_value_renew":
                return { label: "Good Value", color: "#22c55e" };
            default:
                return { label: "Evaluate", color: "#6b7280" };
        }
    };
    const getRoleLabel = (role) => {
        switch (role) {
            case "executor": return "Executor";
            case "courier": return "Courier";
            case "both": return "Executor + Courier";
            default: return role;
        }
    };
    return (_jsxs("div", { className: "mission-modal__section roi-panel", children: [_jsxs("header", { className: "roi-panel__header", children: [_jsxs("div", { children: [_jsx("h3", { children: "ROI Dashboard" }), _jsx("p", { children: "Theoretical vs actual costs across all tasks" })] }), _jsxs("div", { className: "roi-panel__totals", children: [_jsxs("div", { className: "roi-panel__total", children: [formatTokens(totals.totalTokens), " tokens"] }), _jsxs("div", { className: "roi-panel__savings", children: [formatUsd(totals.savings), " saved"] })] })] }), _jsxs("div", { className: "roi-panel__currency-toggle", children: [_jsx("button", { type: "button", className: `roi-panel__toggle ${!showCad ? "is-active" : ""}`, onClick: () => setShowCad(false), children: "USD" }), _jsx("button", { type: "button", className: `roi-panel__toggle ${showCad ? "is-active" : ""}`, onClick: () => setShowCad(true), children: "CAD" })] }), _jsxs("div", { className: "roi-panel__summary-grid", children: [_jsxs("div", { className: "roi-panel__summary-item", children: [_jsx("dt", { children: "Would Have Cost" }), _jsx("dd", { className: "roi-panel__cost--theoretical", children: formatUsd(totals.theoreticalCost) })] }), _jsxs("div", { className: "roi-panel__summary-item", children: [_jsx("dt", { children: "Actually Cost" }), _jsx("dd", { className: "roi-panel__cost--actual", children: formatUsd(totals.actualCost) })] }), _jsxs("div", { className: "roi-panel__summary-item", children: [_jsx("dt", { children: "Total Savings" }), _jsx("dd", { className: "roi-panel__cost--savings", children: formatUsd(totals.savings) })] }), _jsxs("div", { className: "roi-panel__summary-item", children: [_jsx("dt", { children: "Tasks Completed" }), _jsxs("dd", { children: [totals.completedTasks, " / ", totals.totalTasks] })] })] }), _jsxs("dl", { className: "roi-panel__grid", children: [_jsxs("div", { children: [_jsx("dt", { children: "Active slices" }), _jsx("dd", { children: totals.activeSlices })] }), _jsxs("div", { children: [_jsx("dt", { children: "Blocked slices" }), _jsx("dd", { children: totals.blockedSlices })] }), _jsxs("div", { children: [_jsx("dt", { children: "Completed slices" }), _jsx("dd", { children: totals.completedSlices })] }), _jsxs("div", { children: [_jsx("dt", { children: "ROI %" }), _jsxs("dd", { children: [totals.actualCost > 0 ? ((totals.savings / totals.actualCost) * 100).toFixed(1) : 0, "%"] })] })] }), roi?.slices && roi.slices.length > 0 && (_jsxs("div", { className: "roi-panel__section", children: [_jsxs("h4", { className: "roi-panel__section-header", onClick: () => setShowSlices(!showSlices), children: ["By Slice ", showSlices ? "−" : "+"] }), showSlices && (_jsx("ul", { className: "roi-panel__slice-list", children: roi.slices.slice(0, 10).map((slice) => (_jsx("li", { className: "roi-panel__slice-item", children: _jsxs("div", { className: "roi-panel__slice-header", children: [_jsx("div", { className: "roi-panel__slice-name", children: slice.slice_name }), _jsxs("div", { className: "roi-panel__slice-stats", children: [_jsxs("span", { children: [slice.completed_tasks, "/", slice.total_tasks, " tasks"] }), _jsxs("span", { children: [formatTokens(slice.total_tokens_in + slice.total_tokens_out), " tokens"] }), _jsxs("span", { className: "roi-panel__slice-savings", children: [formatUsd(slice.savings_usd), " saved"] })] })] }) }, slice.slice_id))) }))] })), roi?.models && roi.models.length > 0 && (_jsxs("div", { className: "roi-panel__section", children: [_jsxs("h4", { className: "roi-panel__section-header", onClick: () => setShowModels(!showModels), children: ["By Model ", showModels ? "−" : "+"] }), showModels && (_jsx("ul", { className: "roi-panel__model-list", children: roi.models.slice(0, 10).map((model) => (_jsx("li", { className: "roi-panel__model-item", children: _jsxs("div", { className: "roi-panel__model-header", children: [_jsxs("div", { className: "roi-panel__model-name", children: [model.model_name || model.model_id, _jsx("span", { className: "roi-panel__model-role", children: getRoleLabel(model.role) })] }), _jsxs("div", { className: "roi-panel__model-stats", children: [_jsxs("span", { children: [model.total_runs, " runs"] }), _jsxs("span", { children: [formatTokens(model.total_tokens_in + model.total_tokens_out), " tokens"] }), _jsxs("span", { className: "roi-panel__model-savings", children: [formatUsd(model.savings_usd), " saved"] })] })] }) }, model.model_id))) }))] })), roi?.subscriptions && roi.subscriptions.length > 0 && (_jsxs("div", { className: "roi-panel__section", children: [_jsx("h4", { children: "Active Subscriptions" }), _jsx("ul", { className: "roi-panel__subscription-list", children: roi.subscriptions.map((sub) => {
                            const rec = getRecommendationMeta(sub.recommendation);
                            return (_jsxs("li", { className: "roi-panel__subscription-item", children: [_jsxs("div", { className: "roi-panel__subscription-header", children: [_jsx("strong", { children: sub.model_name || sub.model_id }), _jsx("span", { className: "roi-panel__recommendation", style: { backgroundColor: rec.color }, children: rec.label })] }), _jsxs("div", { className: "roi-panel__subscription-stats", children: [_jsxs("span", { children: [formatUsd(sub.subscription_cost_usd || 0), "/mo"] }), _jsxs("span", { children: [sub.days_remaining, " days left"] }), _jsxs("span", { children: [sub.tasks_completed, " tasks"] }), _jsxs("span", { children: [formatUsd(sub.cost_per_task), "/task"] })] })] }, sub.model_id));
                        }) })] })), !roi && (_jsx("p", { className: "roi-panel__note", children: "Connect to Supabase to see live ROI data including theoretical costs, savings, and subscription tracking." }))] }));
};
const AgentDetails = ({ agent, events, slices, roi, onBackToModels, }) => {
    const timeline = useMemo(() => buildAgentTimeline(agent, slices, events), [agent, slices, events]);
    const intel = useMemo(() => buildAgentIntel(agent, slices, events), [agent, slices, events]);
    const [showLog, setShowLog] = useState(false);
    const statusKey = normalizeAgentStatus(agent.status);
    const cooldownLabel = intel.cooldownRemaining ?? agent.cooldownReason ?? "No cooldown";
    const rateLimitSeconds = intel.performance.rateLimitWindowSeconds ?? agent.rateLimitWindowSeconds ?? null;
    const liveTaskId = intel.liveAssignment?.taskId ?? null;
    // Look up ROI data for this model
    const modelId = agent.id.replace(/^agent\./, "");
    const modelRoi = roi?.models?.find(m => m.model_id === modelId);
    const perfMetrics = [
        { label: "Context", value: intel.performance.contextWindow ? `${formatTokenCount(intel.performance.contextWindow)} tokens` : "Unknown" },
        { label: "Effective", value: intel.performance.effectiveContextWindow ? `${formatTokenCount(intel.performance.effectiveContextWindow)} tokens` : "Unknown" },
        { label: "Avg Runtime", value: `${intel.performance.avgRuntime || 0}s` },
        { label: "P95", value: `${intel.performance.p95Runtime || 0}s` },
        { label: "Cost / Run", value: intel.performance.costPerRunUsd ? `$${intel.performance.costPerRunUsd.toFixed(2)}` : "Unknown" },
        { label: "Cost / 1K", value: intel.performance.costPer1kTokensUsd ? `$${intel.performance.costPer1kTokensUsd.toFixed(2)}` : "Unknown" },
        { label: "Tokens Today", value: intel.tokenStats.today.toLocaleString() },
        { label: "Lifetime Tokens", value: intel.tokenStats.lifetime.toLocaleString() },
        { label: "Avg / Task", value: intel.tokenStats.average.toLocaleString() },
        { label: "Peak / Task", value: intel.tokenStats.peak.toLocaleString() },
    ];
    // ROI metrics (if available)
    const roiMetrics = modelRoi ? [
        { label: "Total Runs", value: modelRoi.total_runs.toString() },
        { label: "Role", value: modelRoi.role },
        { label: "Total Cost", value: `$${modelRoi.actual_cost_usd.toFixed(4)}` },
        { label: "Theoretical", value: `$${modelRoi.theoretical_cost_usd.toFixed(4)}` },
        { label: "Total Savings", value: `$${modelRoi.savings_usd.toFixed(4)}` },
    ] : [];
    const stateChips = [
        { label: formatStatusLabel(agent.status), tone: statusKey },
        { label: `Cooldown: ${cooldownLabel}` },
        { label: `Credit: ${formatStatusLabel(intel.creditStatus ?? "unknown")}` },
        { label: `Rate Limit: ${rateLimitSeconds ? `${rateLimitSeconds}s` : "n/a"}` },
    ];
    const warnings = intel.warnings.slice(0, 3);
    const recentTasks = intel.recentTasks.slice(0, 4);
    return (_jsxs("div", { className: "mission-modal__section agent-panel agent-panel--details", children: [_jsxs("header", { className: "agent-panel__hero", children: [_jsx("p", { className: "agent-panel__eyebrow", children: "Model snapshot" }), _jsxs("div", { className: "agent-panel__title-row", children: [agent.icon && _jsx("img", { src: agent.icon, alt: `${agent.name} logo`, className: "agent-panel__logo" }), _jsx("h3", { className: "agent-panel__title", children: agent.name }), _jsx("span", { className: `agent-panel__tier-pill agent-pill__tier agent-pill__tier--${agent.tier.toLowerCase()}`, children: agent.tier }), _jsx("span", { className: `agent-status-badge agent-status-badge--${statusKey}`, children: formatStatusLabel(agent.status) })] }), _jsx("p", { className: "agent-panel__summary", children: agent.summary ?? agent.capability ?? "No summary provided." })] }), _jsxs("div", { className: "agent-panel__lines", children: [_jsxs("div", { className: "agent-panel__line", children: [_jsx("span", { className: "agent-panel__label", children: "State" }), _jsxs("div", { className: "agent-panel__chips", children: [stateChips.map((chip) => (_jsx("span", { className: `agent-panel__chip ${chip.tone ? `agent-panel__chip--${chip.tone}` : ""}`, children: chip.label }, chip.label))), agent.vendor && _jsx("span", { className: "agent-panel__chip agent-panel__chip--subtle", children: agent.vendor }), agent.capability && _jsx("span", { className: "agent-panel__chip agent-panel__chip--subtle", children: agent.capability })] })] }), warnings.length > 0 && (_jsxs("div", { className: "agent-panel__line agent-panel__line--alert", children: [_jsx("span", { className: "agent-panel__label", children: "Warnings" }), _jsx("div", { className: "agent-panel__alerts", children: warnings.map((warning, index) => (_jsx("span", { className: "agent-panel__alert-chip", children: warning }, `${warning}-${index}`))) })] })), _jsxs("div", { className: "agent-panel__line", children: [_jsx("span", { className: "agent-panel__label", children: "Performance & Tokens" }), _jsx("dl", { className: "agent-panel__metrics-grid", children: perfMetrics.map((metric) => (_jsxs("div", { children: [_jsx("dt", { children: metric.label }), _jsx("dd", { children: metric.value })] }, metric.label))) })] }), roiMetrics.length > 0 && (_jsxs("div", { className: "agent-panel__line", children: [_jsx("span", { className: "agent-panel__label", children: "ROI Summary" }), _jsx("dl", { className: "agent-panel__metrics-grid agent-panel__metrics-grid--roi", children: roiMetrics.map((metric) => (_jsxs("div", { children: [_jsx("dt", { children: metric.label }), _jsx("dd", { className: metric.label === "Total Savings" ? "agent-panel__roi-savings" : "", children: metric.value })] }, metric.label))) })] })), _jsxs("div", { className: "agent-panel__line", children: [_jsx("span", { className: "agent-panel__label", children: "Assignments" }), _jsxs("div", { className: "agent-panel__assignments", children: [intel.liveAssignment ? (_jsxs("article", { className: "agent-panel__assignment-card", children: [_jsxs("div", { className: "agent-panel__assignment-main", children: [_jsxs("div", { children: [_jsx("strong", { children: intel.liveAssignment.title ?? intel.liveAssignment.taskId }), _jsx("small", { children: intel.liveAssignment.sliceName ?? "Unknown slice" })] }), _jsx("span", { className: "agent-panel__chip agent-panel__chip--status", children: formatStatusLabel(intel.liveAssignment.status) })] }), intel.routingHistory.length > 0 && (_jsx("ul", { className: "agent-panel__routing-inline", children: intel.routingHistory.map((entry) => (_jsxs("li", { children: [_jsx("span", { className: `agent-routing__badge agent-routing__badge--${entry.direction}`, children: entry.direction }), _jsxs("div", { children: [_jsx("strong", { children: entry.label }), entry.reason && _jsx("small", { children: entry.reason })] })] }, entry.id))) }))] })) : (_jsx("span", { className: "agent-panel__muted agent-panel__muted--inline", children: "No live assignments" })), recentTasks.length > 0 ? (_jsx("ul", { className: "agent-panel__recent-list", children: recentTasks.map((task) => {
                                            const isLive = liveTaskId === task.id;
                                            return (_jsxs("li", { className: `agent-panel__task agent-panel__task--${task.outcome}`, children: [_jsxs("div", { children: [_jsx("strong", { children: task.taskNumber ?? task.title }), _jsx("small", { children: task.sliceName ?? "Unknown slice" })] }), _jsx("span", { children: task.runtimeSeconds ? `${task.runtimeSeconds}s` : "n/a" }), _jsx("span", { className: "agent-panel__task-status", children: formatStatusLabel(task.status) }), isLive && _jsx("span", { className: "agent-panel__task-live", children: "Live" })] }, task.id));
                                        }) })) : (_jsx("span", { className: "agent-panel__muted", children: "No tasks recorded for this agent" }))] })] })] }), _jsxs("section", { className: "agent-detail__section", children: [_jsxs("header", { className: "agent-detail__section-header", children: [_jsx("h4", { children: "Full Activity Log" }), _jsx("button", { type: "button", className: "agent-detail__toggle", onClick: () => setShowLog((prev) => !prev), children: showLog ? "Hide log" : "Show log" })] }), showLog && (_jsxs("div", { className: "agent-panel__timeline", children: [timeline.entries.map((entry) => (_jsxs("article", { className: `agent-panel__event agent-panel__event--${entry.kind}`, children: [_jsxs("header", { children: [_jsx("span", { children: entry.label }), _jsx("time", { children: entry.timestamp })] }), _jsx("p", { children: entry.message })] }, entry.id))), timeline.entries.length === 0 && _jsx("p", { children: "No recent activity for this agent." })] }))] }), onBackToModels && (_jsx("div", { className: "agent-panel__footer", children: _jsxs("button", { type: "button", className: "agent-panel__back-link", onClick: onBackToModels, children: ["\u2190", " Back to models"] }) }))] }));
};
const STATUS_META = {
    pending: { label: "Pending", tone: "default", icon: "\u2022", accent: "#94a3b8" },
    in_progress: { label: "In Progress", tone: "active", icon: "\u21BB", accent: "#67e8f9" },
    received: { label: "Received", tone: "active", icon: "\u21BB", accent: "#86efac" },
    review: { label: "Review", tone: "active", icon: "\u2699", accent: "#a78bfa" },
    testing: { label: "Testing", tone: "active", icon: "\u2699", accent: "#facc15" },
    complete: { label: "Completed", tone: "complete", icon: "\u2713", accent: "#34d399" },
    merge_pending: { label: "Merge Pending", tone: "complete", icon: "\u23F3", accent: "#f0ad4b" },
    merged: { label: "Merged", tone: "complete", icon: "\u2713", accent: "#34d399" },
    failed: { label: "Failed", tone: "locked", icon: "\u2717", accent: "#f87171" },
};
const DEFAULT_STATUS_META = {
    label: "Queued",
    tone: "default",
    icon: "\u2022",
    accent: "#a5b4fc",
};
function resolveStatusMeta(status) {
    return (status ? STATUS_META[status] : undefined) ?? DEFAULT_STATUS_META;
}
const SliceDetails = ({ slice, events, onOpenReview, }) => {
    const [selectedTask, setSelectedTask] = useState(null);
    const [filterKey, setFilterKey] = useState(null);
    const sliceListRef = useRef(null);
    const lastCollapsedTaskRef = useRef(null);
    const pendingScrollTaskRef = useRef(null);
    const pendingAccordionResetRef = useRef(null);
    const assignmentsByTask = useMemo(() => {
        const map = new Map();
        slice.assignments.forEach((assignment) => map.set(assignment.task.id, assignment));
        return map;
    }, [slice.assignments]);
    const statusCounts = useMemo(() => {
        const counts = { complete: 0, active: 0, pending: 0, review: 0 };
        slice.assignments.forEach((assignment) => {
            const status = assignment.task.status;
            if (COMPLETED_STATUSES.has(status))
                counts.complete += 1;
            if (ACTIVE_STATUSES.has(status))
                counts.active += 1;
            if (PENDING_STATUSES.has(status))
                counts.pending += 1;
            if (REVIEW_STATUSES.has(status))
                counts.review += 1;
        });
        return counts;
    }, [slice.assignments]);
    const filterPredicate = filterKey ? SLICE_FILTER_META[filterKey].match : null;
    const orderedAssignments = useMemo(() => {
        if (!filterPredicate) {
            return slice.assignments;
        }
        return slice.assignments
            .slice()
            .sort((a, b) => Number(filterPredicate(b.task.status)) - Number(filterPredicate(a.task.status)));
    }, [slice.assignments, filterPredicate]);
    const handleJumpToTask = (taskId) => {
        const assignmentMatch = slice.assignments.find((assignment) => assignment.task.id === taskId);
        if (assignmentMatch) {
            pendingScrollTaskRef.current = assignmentMatch.task.id;
            setSelectedTask(assignmentMatch.task);
            return;
        }
        const fallback = slice.tasks.find((task) => task.id === taskId);
        if (fallback) {
            pendingScrollTaskRef.current = fallback.id;
            setSelectedTask(fallback);
        }
    };
    const scrollSliceTaskIntoView = useCallback((taskId, behavior = "smooth", block = "nearest") => {
        if (!sliceListRef.current)
            return;
        const target = sliceListRef.current.querySelector(`[data-slice-task="${taskId}"]`);
        target?.scrollIntoView({ behavior, block });
    }, []);
    useEffect(() => {
        if (!selectedTask?.id)
            return;
        if (pendingScrollTaskRef.current === selectedTask.id) {
            scrollSliceTaskIntoView(selectedTask.id, "smooth", "start");
            pendingScrollTaskRef.current = null;
        }
        if (pendingAccordionResetRef.current === selectedTask.id) {
            requestAnimationFrame(() => {
                const accordion = sliceListRef.current?.querySelector(`[data-slice-task="${selectedTask.id}"] .slice-task-list__accordion`);
                accordion?.scrollTo({ top: 0 });
                pendingAccordionResetRef.current = null;
            });
        }
    }, [selectedTask, scrollSliceTaskIntoView]);
    useEffect(() => {
        if (selectedTask || !lastCollapsedTaskRef.current)
            return;
        const taskId = lastCollapsedTaskRef.current;
        lastCollapsedTaskRef.current = null;
        if (taskId) {
            requestAnimationFrame(() => scrollSliceTaskIntoView(taskId, "auto", "start"));
        }
    }, [selectedTask, scrollSliceTaskIntoView]);
    const handleCollapseTask = (taskId) => {
        if (taskId) {
            lastCollapsedTaskRef.current = taskId;
        }
        setSelectedTask(null);
    };
    return (_jsxs("div", { className: "mission-modal__section mission-modal__section--sticky slice-panel", children: [_jsxs("header", { className: "slice-panel__header", children: [_jsxs("div", { children: [_jsx("h3", { children: slice.name }), _jsxs("div", { className: "slice-panel__summary", children: [["complete", "active", "pending", "review"].map((key) => {
                                        const pillMeta = SLICE_FILTER_META[key];
                                        const value = key === "complete"
                                            ? `${slice.completed}/${slice.total}`
                                            : statusCounts[key].toString();
                                        const isActive = filterKey === key;
                                        return (_jsxs("button", { type: "button", className: `slice-panel__summary-pill slice-panel__summary-pill--${pillMeta.tone} ${isActive ? "is-active" : ""}`, style: { borderColor: `${pillMeta.color}66`, color: pillMeta.color }, onClick: () => setFilterKey((prev) => (prev === key ? null : key)), "aria-pressed": isActive, children: [_jsx("span", { "aria-hidden": "true", children: pillMeta.icon }), _jsxs("span", { children: [pillMeta.label, " ", value] })] }, key));
                                    }), slice.tokens !== undefined && (_jsxs("span", { className: "slice-panel__summary-token", children: [formatTokenCount(slice.tokens), " tokens"] }))] })] }), _jsx("button", { type: "button", className: "slice-panel__cta", onClick: () => handleCollapseTask(), children: "Collapse all" })] }), _jsx("div", { className: "slice-panel__content slice-panel__content--stacked", children: _jsx("ul", { className: "slice-task-list", ref: sliceListRef, children: orderedAssignments.map((assignment) => {
                        const isOpen = selectedTask?.id === assignment.task.id;
                        const matchesFilter = Boolean(filterPredicate?.(assignment.task.status));
                        const highlightStyle = matchesFilter && filterKey && !isOpen ? { borderColor: `${SLICE_FILTER_META[filterKey].color}66` } : undefined;
                        const assignmentRecord = assignmentsByTask.get(assignment.task.id) ?? null;
                        const statusMeta = resolveStatusMeta(assignment.task.status);
                        const isReviewTask = REVIEW_STATUSES.has(assignment.task.status);
                        const handleTaskClick = () => {
                            setSelectedTask((prev) => {
                                if (prev?.id === assignment.task.id) {
                                    lastCollapsedTaskRef.current = assignment.task.id;
                                    return null;
                                }
                                pendingScrollTaskRef.current = assignment.task.id;
                                pendingAccordionResetRef.current = assignment.task.id;
                                return assignment.task;
                            });
                            if (isReviewTask && onOpenReview) {
                                onOpenReview(assignment.task.id);
                            }
                        };
                        return (_jsxs("li", { className: `${isOpen ? "is-open" : ""} ${matchesFilter ? "is-highlight" : ""}`.trim(), style: highlightStyle, "data-slice-task": assignment.task.id, children: [_jsxs("button", { type: "button", className: isOpen ? "is-selected" : undefined, onClick: handleTaskClick, "aria-expanded": isOpen, children: [_jsx("span", { className: `slice-task-list__status slice-task-list__status--${statusMeta.tone}`, style: { borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }, children: statusMeta.icon }), _jsxs("div", { className: "slice-task-list__copy", children: [_jsx("span", { className: "slice-task-list__title", children: assignment.task.taskNumber ?? assignment.task.title ?? "Task" }), _jsxs("div", { className: "slice-task-list__meta-row", children: [_jsx("span", { className: `slice-task-list__meta ${isReviewTask ? "slice-task-list__meta--review" : ""}`, style: { color: statusMeta.accent }, children: statusMeta.label ?? assignment.task.status.replace(/_/g, " ") }), assignment.task.mergePending && (_jsxs(_Fragment, { children: [_jsx("span", { className: "slice-task-list__meta-divider", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { className: "slice-task-list__merge-pending", children: "\u25B3 Merge pending" })] })), isReviewTask && onOpenReview && (_jsxs(_Fragment, { children: [_jsx("span", { className: "slice-task-list__meta-divider", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { role: "button", tabIndex: 0, className: "slice-task-list__review-link", onClick: (event) => {
                                                                        event.stopPropagation();
                                                                        onOpenReview(assignment.task.id);
                                                                    }, onKeyDown: (event) => {
                                                                        if (event.key === "Enter" || event.key === " ") {
                                                                            event.preventDefault();
                                                                            event.stopPropagation();
                                                                            onOpenReview(assignment.task.id);
                                                                        }
                                                                    }, children: "Review Now" })] }))] })] }), _jsx("span", { className: "slice-task-list__summary", children: assignment.task.summary ?? assignment.task.title })] }), isOpen && (_jsx("div", { className: "slice-task-list__accordion", children: _jsx(TaskDetail, { task: assignment.task, assignment: assignmentRecord, events: events.filter((event) => event.taskId === assignment.task.id), onJumpToTask: handleJumpToTask, onCollapse: () => handleCollapseTask(assignment.task.id) }) }))] }, assignment.task.id));
                    }) }) })] }));
};
const AssignmentDetails = ({ assignment, slice, events }) => {
    const [activityExpanded, setActivityExpanded] = useState(false);
    const task = assignment.task;
    const agent = assignment.agent;
    const sortedEvents = useMemo(() => events
        .filter((event) => event.taskId === task.id)
        .slice()
        .sort((a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf()), [events, task.id]);
    const activityLogs = useMemo(() => sortedEvents.slice(0, 32), [sortedEvents]);
    const wasRerouted = useMemo(() => sortedEvents.some((event) => ROUTING_EVENT_TYPES.has(event.type)), [sortedEvents]);
    const warningEvents = useMemo(() => sortedEvents
        .filter((event) => {
        const category = deriveLogCategory(event);
        return category === "warning" || category === "error";
    })
        .slice(0, 2), [sortedEvents]);
    const warningMessages = useMemo(() => {
        const messages = warningEvents.map((event) => ({
            id: event.id,
            message: extractEventMessage(event) ?? event.reasonCode ?? formatEventLabel(event.type),
            timestamp: new Date(event.timestamp).toLocaleString(),
            category: deriveLogCategory(event),
        }));
        if (assignment.isBlocking) {
            messages.unshift({
                id: `${task.id}-blocking`,
                message: "Marked blocking — requires attention before proceeding.",
                timestamp: new Date(task.updatedAt).toLocaleString(),
                category: "warning",
            });
        }
        return messages;
    }, [warningEvents, assignment.isBlocking, task.id, task.updatedAt]);
    const statusMeta = resolveStatusMeta(task.status);
    const updatedAt = new Date(task.updatedAt).toLocaleString();
    const tokensUsed = task.metrics?.tokensUsed;
    const runtimeSeconds = task.metrics?.runtimeSeconds;
    const costPerTask = tokensUsed !== undefined && agent?.costPer1kTokensUsd ? (tokensUsed / 1000) * agent.costPer1kTokensUsd : null;
    const mergePending = task.mergePending ?? false;
    return (_jsxs("div", { className: "mission-modal__section assignment-detail", children: [_jsxs("header", { className: "assignment-detail__header", children: [_jsxs("div", { children: [_jsx("p", { className: "assignment-detail__eyebrow", children: slice.name }), _jsx("h3", { children: task.taskNumber ?? task.title }), _jsx("p", { className: "assignment-detail__summary", children: task.summary ?? task.packet?.prompt ?? "No task summary provided yet." })] }), _jsxs("div", { className: "assignment-detail__status", children: [_jsxs("span", { className: "assignment-detail__status-pill", style: { borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }, children: [_jsx("span", { "aria-hidden": "true", children: statusMeta.icon }), " ", statusMeta.label] }), mergePending && (_jsx("span", { className: "assignment-detail__status-pill assignment-detail__status-pill--merge-pending", title: "Merge pending - system resolving", children: "\u26A0 Merge pending" })), agent && (_jsxs("div", { className: "assignment-detail__agent", children: [_jsx("span", { children: agent.name }), _jsx("small", { children: formatStatusLabel(agent.status) })] }))] })] }), _jsxs("section", { className: "assignment-detail__section assignment-detail__section--inline", children: [_jsx("header", { children: _jsx("h4", { children: "Current Progress" }) }), _jsxs("div", { className: "assignment-detail__row assignment-detail__row--status", children: [_jsx("span", { className: "assignment-detail__label", children: "Status" }), _jsx("span", { style: { color: statusMeta.accent }, children: formatStatusLabel(task.status) })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Updated" }), _jsx("span", { children: updatedAt })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Tokens used" }), _jsx("span", { children: tokensUsed !== undefined ? tokensUsed.toLocaleString() : "Unknown" })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Cost" }), _jsx("span", { children: costPerTask !== null ? `$${costPerTask.toFixed(2)}` : "Unknown" })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Cost / 1k tokens" }), _jsx("span", { children: agent?.costPer1kTokensUsd ? `$${agent.costPer1kTokensUsd.toFixed(2)}` : "Unknown" })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Runtime" }), _jsx("span", { children: runtimeSeconds !== undefined ? `${runtimeSeconds}s` : "n/a" })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Rate limit" }), _jsx("span", { children: agent?.rateLimitWindowSeconds ? `${agent.rateLimitWindowSeconds}s` : "n/a" })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Rerouted" }), _jsx("span", { children: wasRerouted ? "Yes" : "No" })] }), _jsxs("div", { className: "assignment-detail__row", children: [_jsx("span", { className: "assignment-detail__label", children: "Blocking" }), _jsx("span", { children: assignment.isBlocking ? "Yes" : "No" })] })] }), _jsxs("section", { className: "assignment-detail__section", children: [_jsxs("button", { type: "button", className: "task-detail__section-header", onClick: () => setActivityExpanded(!activityExpanded), "aria-expanded": activityExpanded, children: [_jsx("h4", { children: "Activity" }), _jsx("span", { className: "task-detail__toggle", children: activityExpanded ? "Collapse −" : "Expand +" })] }), activityExpanded && (_jsxs(_Fragment, { children: [warningMessages.length > 0 && (_jsx("div", { className: "assignment-detail__activity-warnings", children: warningMessages.map((entry) => (_jsx("article", { className: `assignment-detail__activity-warning assignment-detail__activity-warning--${entry.category}`, children: _jsxs("div", { children: [_jsx("strong", { children: entry.message }), _jsx("small", { children: entry.timestamp })] }) }, entry.id))) })), _jsx("ul", { className: "mission-log-list assignment-detail__log", children: activityLogs.length > 0 ? (activityLogs.map((event) => {
                                    const category = deriveLogCategory(event);
                                    const summary = extractEventMessage(event) ?? event.reasonCode ?? null;
                                    const participants = deriveEventParticipants(event);
                                    return (_jsxs("li", { children: [_jsx("span", { className: `mission-log__bullet mission-log__bullet--${category}` }), _jsxs("div", { className: "mission-log__entry", children: [_jsxs("div", { className: "mission-log__headline", children: [_jsx("strong", { className: `mission-log__title mission-log__title--${category}`, children: formatEventLabel(event.type) }), summary && _jsxs("span", { className: "mission-log__summary", children: [". ", summary] })] }), participants.length > 0 && (_jsx("div", { className: "mission-log__participants", children: participants.map((participant) => (_jsx("span", { className: "mission-log__participant", children: participant }, `${event.id}-${participant}`))) })), _jsx("span", { className: "mission-log__timestamp", children: new Date(event.timestamp).toLocaleString() })] })] }, event.id));
                                })) : (_jsx("li", { children: "No activity recorded for this task yet." })) })] }))] })] }));
};
export const TaskDetail = ({ task, assignment, events, onJumpToTask, onCollapse, }) => {
    const [prompt, setPrompt] = useState(task.packet?.prompt ?? "");
    const [activityExpanded, setActivityExpanded] = useState(false);
    const statusMeta = resolveStatusMeta(task.status);
    return (_jsxs("div", { className: "task-detail", children: [_jsxs("header", { children: [_jsx("h4", { children: task.taskNumber ?? task.title }), _jsx("span", { className: "task-chip", style: { borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }, children: statusMeta.label }), task.mergePending && (_jsx("span", { className: "task-chip task-chip--merge-pending", children: "\u25B3 Merge pending" }))] }), assignment?.agent && (_jsxs("p", { className: "task-detail__agent", children: ["Assigned to ", _jsx("strong", { children: assignment.agent.name }), " (", assignment.agent.status, ")"] })), _jsxs("dl", { className: "task-detail__meta", children: [_jsxs("div", { children: [_jsx("dt", { children: "Confidence" }), _jsxs("dd", { children: [Math.round(task.confidence * 100), "%"] })] }), _jsxs("div", { children: [_jsx("dt", { children: "Updated" }), _jsx("dd", { children: new Date(task.updatedAt).toLocaleString() })] }), task.metrics?.tokensUsed !== undefined && (_jsxs("div", { children: [_jsx("dt", { children: "Tokens" }), _jsx("dd", { children: task.metrics.tokensUsed.toLocaleString() })] })), task.metrics?.runtimeSeconds !== undefined && (_jsxs("div", { children: [_jsx("dt", { children: "Runtime" }), _jsxs("dd", { children: [task.metrics.runtimeSeconds, "s"] })] }))] }), task.dependencies && task.dependencies.length > 0 && (_jsxs("div", { className: "task-detail__deps", children: [_jsx("h5", { children: "Dependencies" }), _jsx("ul", { children: task.dependencies.map((dep) => (_jsx("li", { children: _jsx("button", { type: "button", onClick: () => onJumpToTask(dep), children: dep }) }, dep))) })] })), _jsxs("div", { className: "task-detail__prompt", children: [_jsx("h5", { children: "Prompt Packet" }), _jsx("textarea", { value: prompt, onChange: (event) => setPrompt(event.target.value) }), task.packet?.attachments && task.packet.attachments.length > 0 && (_jsx("ul", { children: task.packet.attachments.map((attachment) => (_jsx("li", { children: _jsx("a", { href: attachment.href, target: "_blank", rel: "noreferrer", children: attachment.label }) }, attachment.href))) }))] }), _jsxs("div", { className: "task-detail__events", children: [_jsxs("button", { type: "button", className: "task-detail__section-header", onClick: () => setActivityExpanded(!activityExpanded), "aria-expanded": activityExpanded, children: [_jsx("h5", { children: "Recent activity" }), _jsx("span", { className: "task-detail__toggle", children: activityExpanded ? "Collapse −" : "Expand +" })] }), activityExpanded && (_jsxs("ul", { className: "task-activity-list", children: [events.map((event) => {
                                const eventMeta = getEventMeta(event);
                                return (_jsxs("li", { className: `task-activity-item task-activity-item--${eventMeta.tone}`, children: [_jsx("span", { className: `task-activity__badge task-activity__badge--${eventMeta.tone}`, children: eventMeta.icon }), _jsxs("div", { className: "task-activity__content", children: [_jsxs("div", { className: "task-activity__header", children: [_jsx("strong", { className: `task-activity__title task-activity__title--${eventMeta.tone}`, children: eventMeta.label }), _jsx("span", { className: "task-activity__time", children: new Date(event.timestamp).toLocaleString() })] }), (() => {
                                                    const modelId = event.details?.modelId;
                                                    return modelId ? _jsx("span", { className: "task-activity__model", children: String(modelId) }) : null;
                                                })(), event.reasonCode && (_jsx("p", { className: "task-activity__reason", children: event.reasonCode })), (() => {
                                                    const from = event.details?.fromRunnerId;
                                                    const to = event.details?.toRunnerId;
                                                    return from && to ? (_jsxs("p", { className: "task-activity__route", children: [String(from), " \u2192 ", String(to)] })) : null;
                                                })()] })] }, event.id));
                            }), events.length === 0 && _jsx("li", { className: "task-activity-item--empty", children: "No activity recorded for this task yet." })] }))] }), onCollapse && (_jsx("div", { className: "task-detail__actions", children: _jsx("button", { type: "button", className: "task-detail__collapse", onClick: onCollapse, children: "Return to task list" }) }))] }));
};
const AddAgentForm = ({ onClose }) => {
    const [value, setValue] = useState("");
    const handleSubmit = (event) => {
        event.preventDefault();
        onClose();
    };
    return (_jsxs("form", { className: "mission-modal__section", onSubmit: handleSubmit, children: [_jsx("h3", { children: "Add Platform or Model" }), _jsxs("label", { className: "mission-field", children: ["Platform / Model Name", _jsx("input", { value: value, onChange: (event) => setValue(event.target.value), placeholder: "e.g. OpenAI GPT-5" })] }), _jsx("p", { className: "mission-modal__hint", children: "Hook this into the registry by updating data/registry/platforms/index.json." }), _jsxs("div", { className: "mission-modal__actions", children: [_jsx("button", { type: "button", onClick: onClose, className: "mission-button mission-button--ghost", children: "Cancel" }), _jsx("button", { type: "submit", className: "mission-button mission-button--primary", disabled: !value.trim(), children: "Save" })] })] }));
};
function buildAgentTimeline(agent, slices, events) {
    const assignmentRecords = collectAgentAssignments(agent, slices);
    const assignments = assignmentRecords.map((record) => record.assignment);
    const taskIds = new Set(assignments.map((assignment) => assignment.task.id));
    const timelineEvents = events
        .filter((event) => (event.taskId ? taskIds.has(event.taskId) : false))
        .map((event) => ({
        id: event.id,
        kind: inferLogTone(event),
        label: event.type,
        timestamp: new Date(event.timestamp).toLocaleString(),
        message: extractEventMessage(event) ?? "",
    }));
    const successRate = assignments.length === 0 ? 100 : Math.round((assignments.filter((assignment) => isCompleted(assignment.task.status)).length / assignments.length) * 100);
    const tokensUsed = assignments.reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
    return {
        entries: timelineEvents,
        activeAssignments: assignments.filter((assignment) => ACTIVE_STATUSES.has(assignment.task.status)),
        successRate,
        tokensUsed,
    };
}
function inferLogTone(event) {
    if (event.reasonCode?.startsWith("E/")) {
        return "error";
    }
    if (event.type === "failure") {
        return "error";
    }
    if (event.type === "warning" || event.type === "note") {
        return "warn";
    }
    return "success";
}
function extractEventMessage(event) {
    if (!event.details) {
        return null;
    }
    if ("message" in event.details) {
        const value = event.details.message;
        if (value === undefined || value === null) {
            return null;
        }
        return typeof value === "string" ? value : JSON.stringify(value);
    }
    return null;
}
function formatEventLabel(value) {
    if (!value)
        return "Update";
    return value
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}
function getEventMeta(event) {
    const type = event.type.toLowerCase();
    // Pipeline lifecycle events
    if (type.includes("prd_committed")) {
        return { label: "PRD Committed", icon: "📄", tone: "note" };
    }
    if (type.includes("plan_created")) {
        return { label: "Plan Created", icon: "📋", tone: "assigned" };
    }
    if (type.includes("plan_approved")) {
        return { label: "Plan Approved", icon: "✓", tone: "approved" };
    }
    if (type.includes("plan_rejected")) {
        return { label: "Plan Rejected", icon: "✗", tone: "failed" };
    }
    if (type.includes("council_approved")) {
        return { label: "Council Pass", icon: "👍", tone: "approved" };
    }
    if (type.includes("council_rejected")) {
        return { label: "Council Reject", icon: "👎", tone: "failed" };
    }
    if (type.includes("task_started")) {
        return { label: "Agent Dispatched", icon: "🚀", tone: "assigned" };
    }
    if (type.includes("run_completed")) {
        return { label: "Run Done", icon: "✓", tone: "completed" };
    }
    if (type.includes("run_failed")) {
        return { label: "Run Failed", icon: "✗", tone: "failed" };
    }
    if (type.includes("task_completed")) {
        return { label: "Task Complete", icon: "✓", tone: "completed" };
    }
    if (type.includes("task_failed")) {
        return { label: "Task Failed", icon: "✗", tone: "failed" };
    }
    if (type.includes("test_passed")) {
        return { label: "Tests Passed", icon: "✓", tone: "testing" };
    }
    if (type.includes("test_failed")) {
        return { label: "Tests Failed", icon: "✗", tone: "failed" };
    }
    if (type.includes("failure_detected")) {
        return { label: "Failure", icon: "⚠", tone: "failed" };
    }
    if (type.includes("maintenance_completed")) {
        return { label: "Maintenance Done", icon: "🔧", tone: "completed" };
    }
    if (type.includes("maintenance_failed")) {
        return { label: "Maintenance Failed", icon: "🔧", tone: "failed" };
    }
    if (type.includes("maintenance_started")) {
        return { label: "Maintenance", icon: "🔧", tone: "assigned" };
    }
    // Legacy event types
    if (type.includes("assigned")) {
        return { label: "Assigned", icon: "→", tone: "assigned" };
    }
    if (type.includes("route") || type.includes("reroute")) {
        return { label: "Rerouted", icon: "↻", tone: "route" };
    }
    if (type.includes("completed")) {
        return { label: "Completed", icon: "✓", tone: "completed" };
    }
    if (type.includes("testing") || type.includes("test")) {
        const passed = event.details?.passed === true || event.details?.tests_passed === true;
        return {
            label: passed ? "Tests Passed" : "Testing",
            icon: passed ? "✓" : "⚙",
            tone: passed ? "testing" : "note"
        };
    }
    if (type.includes("approved") || type.includes("approval")) {
        return { label: "Approved", icon: "✓", tone: "approved" };
    }
    if (type.includes("fail") || type.includes("error") || type.includes("reject")) {
        return { label: "Failed", icon: "✗", tone: "failed" };
    }
    return { label: formatEventLabel(event.type), icon: "•", tone: "note" };
}
function deriveLogCategory(event) {
    const type = event.type.toLowerCase();
    if (type.includes("route")) {
        return "route";
    }
    if (type.includes("validation") || type.includes("validator")) {
        return "validation";
    }
    if (type.includes("retry") || type.includes("reroute")) {
        return "retry";
    }
    if (event.reasonCode?.startsWith("E/") || type === "failure") {
        return "error";
    }
    // Pipeline failure states
    if (type.includes("failed") || type.includes("reject") || type.includes("failure_detected")) {
        return "error";
    }
    // Maintenance events
    if (type.includes("maintenance")) {
        return "note";
    }
    if (type === "warning") {
        return "warning";
    }
    if (type === "note" || type === "prd_committed") {
        return "note";
    }
    return "success";
}
function deriveEventParticipants(event) {
    if (!event.details) {
        return [];
    }
    const details = event.details;
    const participants = new Set();
    const from = readDetailString(details, ["fromRole", "fromProvider", "fromAgent", "previousAgent", "sourceAgent"]);
    const to = readDetailString(details, ["toRole", "toProvider", "toAgent", "nextAgent", "targetAgent"]);
    if (from || to) {
        const fromLabel = formatStatusLabel(from ?? "Previous agent");
        const toLabel = to ? formatStatusLabel(to) : null;
        participants.add(toLabel ? `${fromLabel} -> ${toLabel}` : fromLabel);
    }
    const actorKeys = ["agentRole", "role", "agent", "agentName", "agentId", "assignedAgent", "supervisor", "planner", "watcher", "tester", "orchestrator"];
    actorKeys.forEach((key) => {
        const value = readDetailString(details, [key]);
        if (value) {
            participants.add(formatStatusLabel(value));
        }
    });
    return Array.from(participants);
}
function readDetailString(details, keys) {
    for (const key of keys) {
        const raw = details[key];
        if (typeof raw === "string") {
            const trimmed = raw.trim();
            if (trimmed.length > 0) {
                return trimmed;
            }
        }
    }
    return null;
}
function formatLogCategory(category) {
    switch (category) {
        case "route":
            return "Route";
        case "validation":
            return "Validation";
        case "retry":
            return "Retry";
        case "warning":
            return "Warning";
        case "note":
            return "Note";
        case "error":
            return "Error";
        default:
            return "Success";
    }
}
function isCompleted(status) {
    return status === "complete" || status === "merged" || status === "merge_pending";
}
function formatTokenCount(value) {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (value >= 10_000) {
        return `${Math.round(value / 1_000)}K`;
    }
    return value.toLocaleString();
}
function buildAgentIntel(agent, slices, events) {
    const assignmentRecords = collectAgentAssignments(agent, slices);
    const assignments = assignmentRecords.map((record) => record.assignment);
    const liveAssignmentRecord = assignmentRecords.find((record) => ACTIVE_STATUSES.has(record.assignment.task.status));
    return {
        liveAssignment: liveAssignmentRecord
            ? {
                taskId: liveAssignmentRecord.assignment.task.id,
                title: liveAssignmentRecord.assignment.task.taskNumber ?? liveAssignmentRecord.assignment.task.title,
                sliceName: liveAssignmentRecord.slice.name,
                status: liveAssignmentRecord.assignment.task.status,
                summary: liveAssignmentRecord.assignment.task.summary ?? liveAssignmentRecord.assignment.task.packet?.prompt,
            }
            : null,
        recentTasks: buildRecentTasks(assignmentRecords),
        routingHistory: buildRoutingHistory(agent, events),
        tokenStats: deriveTokenStats(assignments),
        performance: derivePerformanceStats(assignments, agent),
        warnings: deriveAgentWarnings(agent, assignmentRecords, events),
        cooldownRemaining: calculateCooldownRemaining(agent),
        creditStatus: agent.creditStatus ?? "unknown",
    };
}
function buildRoutingHistory(agent, events) {
    return events
        .filter((event) => ROUTING_EVENT_TYPES.has(event.type))
        .filter((event) => {
        const details = event.details ?? {};
        const toAgent = typeof details?.["toAgent"] === "string" ? details["toAgent"] : null;
        const fromAgent = typeof details?.["fromAgent"] === "string" ? details["fromAgent"] : null;
        const agentId = typeof details?.["agentId"] === "string" ? details["agentId"] : null;
        return toAgent === agent.id || fromAgent === agent.id || agentId === agent.id;
    })
        .slice(0, 3)
        .map((event) => {
        const details = event.details ?? {};
        const toAgent = typeof details?.["toAgent"] === "string" ? details["toAgent"] : null;
        const fromAgent = typeof details?.["fromAgent"] === "string" ? details["fromAgent"] : null;
        const direction = event.type === "validation" ? "validation" : event.type === "retry" || event.type === "reroute" ? "retry" : fromAgent === agent.id ? "from" : "to";
        const label = typeof details?.["label"] === "string"
            ? details["label"]
            : direction === "from"
                ? `Routed from ${details?.["fromProvider"] ?? fromAgent ?? "unknown"}`
                : direction === "validation"
                    ? "Validator check"
                    : `Routed to ${details?.["toProvider"] ?? toAgent ?? "unknown"}`;
        const reason = typeof details?.["reason"] === "string" ? details["reason"] : details?.["message"] ? String(details["message"]) : undefined;
        return {
            id: event.id,
            timestamp: event.timestamp,
            direction,
            label,
            reason,
        };
    });
}
function deriveTokenStats(assignments) {
    const todayCutoff = Date.now() - 24 * 60 * 60 * 1000;
    const lifetime = assignments.reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
    const today = assignments
        .filter((assignment) => {
        const updated = assignment.task.updatedAt ? new Date(assignment.task.updatedAt).valueOf() : 0;
        return updated >= todayCutoff;
    })
        .reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
    const peak = assignments.reduce((max, assignment) => Math.max(max, assignment.task.metrics?.tokensUsed ?? 0), 0);
    const average = assignments.length === 0 ? 0 : Math.round(lifetime / assignments.length);
    return { today, lifetime, peak, average };
}
function derivePerformanceStats(assignments, agent) {
    const runtimes = assignments
        .map((assignment) => assignment.task.metrics?.runtimeSeconds)
        .filter((value) => typeof value === "number");
    const avgRuntime = runtimes.length === 0 ? 0 : Math.round(runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length);
    const p95Runtime = runtimes.length === 0
        ? 0
        : (() => {
            const sorted = runtimes.slice().sort((a, b) => a - b);
            const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
            return sorted[index];
        })();
    return {
        avgRuntime,
        p95Runtime,
        contextWindow: agent.contextWindowTokens,
        effectiveContextWindow: agent.effectiveContextWindowTokens ?? agent.contextWindowTokens,
        costPerRunUsd: agent.costPerRunUsd,
        costPer1kTokensUsd: agent.costPer1kTokensUsd,
        rateLimitWindowSeconds: agent.rateLimitWindowSeconds ?? null,
    };
}
function deriveAgentWarnings(agent, records, events) {
    const warnings = new Set();
    (agent.warnings ?? []).forEach((warning) => warnings.add(warning));
    if (agent.cooldownReason) {
        warnings.add(agent.cooldownReason);
    }
    const taskIds = new Set(records.map((record) => record.assignment.task.id));
    events
        .filter((event) => event.type === "warning" && taskIds.has(event.taskId))
        .forEach((event) => {
        const message = extractEventMessage(event) ?? event.reasonCode ?? "Warning reported";
        warnings.add(message);
    });
    return Array.from(warnings).slice(0, 4);
}
