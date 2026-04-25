import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskDetail } from "./modals/MissionModals";
import VibesChatPanel from "./vibes/VibesChatPanel";
const HEADER_COMPLETE_STATUSES = new Set(["complete", "merged", "merge_pending"]);
const HEADER_ACTIVE_STATUSES = new Set(["in_progress", "received", "review", "testing"]);
const HEADER_PENDING_STATUSES = new Set(["pending", "failed"]);
// REVIEW_STATUS is used for supervisor automated output review (not human).
// Header review button is reserved for: (1) visual UI/UX review,
// (2) architecture decisions after Council, (3) API key credit exhausted.
// Those scenarios will use a separate mechanism (e.g. human_review flag).
// Until that mechanism exists, no task status triggers the header review pill.
const HEADER_REVIEW_STATUSES = new Set([]);
const HEADER_STATUS_META = {
    pending: { label: "Queued", tone: "default", icon: "\u2022", accent: "#94a3b8" },
    in_progress: { label: "In Progress", tone: "active", icon: "\u21BB", accent: "#67e8f9" },
    received: { label: "Received", tone: "active", icon: "\u21BB", accent: "#86efac" },
    review: { label: "Review", tone: "active", icon: "\u2699", accent: "#a78bfa" },
    testing: { label: "Testing", tone: "active", icon: "\u2699", accent: "#facc15" },
    complete: { label: "Completed", tone: "complete", icon: "\u2713", accent: "#34d399" },
    merge_pending: { label: "Merge Pending", tone: "complete", icon: "\u23F3", accent: "#f0ad4b" },
    merged: { label: "Merged", tone: "complete", icon: "\u2713", accent: "#34d399" },
    failed: { label: "Failed", tone: "locked", icon: "\u2717", accent: "#f87171" },
};
const DEFAULT_HEADER_STATUS_META = {
    label: "Queued",
    tone: "default",
    icon: "\u2022",
    accent: "#a5b4fc",
};
function resolveStatusMeta(status) {
    if (!status)
        return DEFAULT_HEADER_STATUS_META;
    return HEADER_STATUS_META[status] ?? DEFAULT_HEADER_STATUS_META;
}
function formatTokenCount(value) {
    if (value >= 1_000_000) {
        const precise = value / 1_000_000;
        return `${Number.isInteger(precise) ? precise.toFixed(0) : precise.toFixed(1)}M`;
    }
    if (value >= 10_000) {
        return `${Math.round(value / 1_000)}K`;
    }
    return value.toLocaleString();
}
function formatUsd(amount) {
    if (amount === 0)
        return "$0";
    if (Math.abs(amount) < 0.01)
        return "<$0.01";
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}
const HEADER_PILL_CONFIGS = [
    {
        key: "complete",
        label: "Complete",
        description: "Completed tasks vs mission total",
        subtitle: "Complete to date",
        icon: "\u2713",
        tone: "pill-complete",
        filter: (task) => HEADER_COMPLETE_STATUSES.has(task.status),
    },
    {
        key: "active",
        label: "Active",
        description: "Currently active mission tasks",
        subtitle: "Currently active",
        icon: "\u21BB",
        tone: "pill-active",
        filter: (task) => HEADER_ACTIVE_STATUSES.has(task.status),
    },
    {
        key: "pending",
        label: "Pending",
        description: "Waiting on dependencies",
        subtitle: "Awaiting dependencies",
        icon: "\u23F3",
        tone: "pill-locked",
        filter: (task) => HEADER_PENDING_STATUSES.has(task.status),
    },
    {
        key: "review",
        label: "Review",
        description: "Supervisor reviewing output",
        subtitle: "In review",
        icon: "\u{1F504}",
        tone: "pill-flagged",
        filter: (task) => HEADER_REVIEW_STATUSES.has(task.status),
    },
];
const MissionHeader = ({ statusSummary, tasks, slices, events, snapshotTime, tokenUsage, roi, onOpenTokens, onOpenReviewTask, }) => {
    const [activePill, setActivePill] = useState(null);
    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isVibesChatOpen, setIsVibesChatOpen] = useState(false);
    const pillListRef = useRef(null);
    const lastCollapsedTaskRef = useRef(null);
    const pendingScrollTaskRef = useRef(null);
    const progress = useMemo(() => {
        if (statusSummary.total === 0) {
            return 0;
        }
        return Math.round((statusSummary.completed / statusSummary.total) * 100);
    }, [statusSummary.completed, statusSummary.total]);
    const taskBuckets = useMemo(() => {
        const counts = { complete: 0, active: 0, pending: 0, review: 0 };
        tasks.forEach((task) => {
            const status = task.status;
            if (HEADER_COMPLETE_STATUSES.has(status))
                counts.complete += 1;
            if (HEADER_ACTIVE_STATUSES.has(status))
                counts.active += 1;
            if (HEADER_PENDING_STATUSES.has(status))
                counts.pending += 1;
            if (HEADER_REVIEW_STATUSES.has(status))
                counts.review += 1;
        });
        return counts;
    }, [tasks]);
    const pills = useMemo(() => {
        const totalTasks = Math.max(statusSummary.total, 1);
        return HEADER_PILL_CONFIGS.map((pill) => ({
            ...pill,
            value: pill.key === "complete" ? `${taskBuckets.complete}/${totalTasks}` : taskBuckets[pill.key],
        }));
    }, [statusSummary.total, taskBuckets]);
    const activeDetail = useMemo(() => {
        if (!activePill)
            return null;
        const pill = pills.find((candidate) => candidate.key === activePill);
        if (!pill)
            return null;
        const detailedTasks = tasks.filter(pill.filter);
        return {
            pill,
            tasks: detailedTasks,
        };
    }, [activePill, pills, tasks]);
    const assignmentInfoByTask = useMemo(() => {
        const map = new Map();
        slices.forEach((slice) => {
            slice.assignments.forEach((assignment) => {
                map.set(assignment.task.id, { assignment, sliceName: slice.name });
            });
            slice.tasks.forEach((task) => {
                if (!map.has(task.id)) {
                    map.set(task.id, { assignment: null, sliceName: slice.name });
                }
            });
        });
        return map;
    }, [slices]);
    const eventsByTask = useMemo(() => {
        const map = new Map();
        events.forEach((event) => {
            if (!event.taskId)
                return;
            if (!map.has(event.taskId)) {
                map.set(event.taskId, []);
            }
            map.get(event.taskId).push(event);
        });
        return map;
    }, [events]);
    const scrollTaskIntoView = useCallback((taskId, behavior = "smooth", block = "nearest") => {
        if (!pillListRef.current)
            return;
        const target = pillListRef.current.querySelector(`[data-task-accordion="${taskId}"]`);
        target?.scrollIntoView({ behavior, block });
    }, []);
    const handleTaskToggle = (taskId) => {
        if (!taskId) {
            setSelectedTaskId(null);
            return;
        }
        setSelectedTaskId((prev) => {
            if (prev === taskId) {
                lastCollapsedTaskRef.current = taskId;
                return null;
            }
            return taskId;
        });
    };
    useEffect(() => {
        if (!selectedTaskId || !pillListRef.current)
            return;
        if (pendingScrollTaskRef.current === selectedTaskId) {
            scrollTaskIntoView(selectedTaskId, "smooth", "start");
            pendingScrollTaskRef.current = null;
        }
    }, [selectedTaskId, scrollTaskIntoView]);
    useEffect(() => {
        if (selectedTaskId !== null || !lastCollapsedTaskRef.current)
            return;
        const taskId = lastCollapsedTaskRef.current;
        lastCollapsedTaskRef.current = null;
        if (taskId) {
            requestAnimationFrame(() => scrollTaskIntoView(taskId, "auto", "start"));
        }
    }, [selectedTaskId, scrollTaskIntoView]);
    const handleCollapseTask = (taskId) => {
        if (taskId) {
            lastCollapsedTaskRef.current = taskId;
        }
        setSelectedTaskId(null);
    };
    const handleJumpToTask = (targetId) => {
        pendingScrollTaskRef.current = targetId;
        setSelectedTaskId(targetId);
    };
    const formatTaskLabel = (task) => {
        if (task.taskNumber) {
            const cleaned = String(task.taskNumber).replace(/task\s*#/i, "").replace(/^#/i, "").trim();
            return cleaned ? `Task #${cleaned}` : "Task";
        }
        return task.title ?? task.id ?? "Task";
    };
    const formatTaskInfo = (task) => {
        if (task.summary)
            return task.summary;
        if (task.title)
            return task.title;
        return task.status.replace(/_/g, " ");
    };
    const formattedTokens = useMemo(() => formatTokenCount(tokenUsage), [tokenUsage]);
    return (_jsxs("header", { className: "mission-header", children: [_jsxs("div", { className: "mission-header__identity", children: [_jsxs("button", { className: "vibes-orb vibes-orb--interactive", onClick: () => setIsVibesChatOpen(true), "aria-label": "Open Vibes chat", title: "Chat with Vibes", children: [_jsx("span", { className: "vibes-orb__label", children: "Vibes" }), _jsx("span", { className: "vibes-orb__text-label", children: "Text me" })] }), _jsxs("div", { className: "mission-header__titles", children: [_jsxs("p", { className: "mission-header__eyebrow", children: [_jsx("span", { children: "Mission Control" }), _jsx("span", { className: "mission-header__separator", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { className: "mission-header__brand", children: "Vibeflow" })] }), _jsx("p", { className: "mission-header__subtitle", children: "Live orchestrations, telemetry, and ROI tracking at a glance." })] })] }), _jsxs("div", { className: "mission-header__content", children: [_jsxs("div", { className: "mission-header__tasks-row", role: "group", "aria-label": "Mission snapshot", children: [pills.map((pill) => (_jsx("button", { type: "button", className: `mission-header__stat-pill mission-header__stat-pill--${pill.tone}`, title: pill.description, "aria-label": `${pill.label}: ${pill.value}`, "aria-expanded": activePill === pill.key, "data-active": activePill === pill.key ? "true" : "false", onClick: () => setActivePill((prev) => (prev === pill.key ? null : pill.key)), children: _jsxs("div", { className: "mission-header__stat-body", children: [_jsxs("span", { className: "mission-header__stat-primary", children: [_jsx("span", { className: "mission-header__stat-icon", "aria-hidden": "true", children: pill.icon }), _jsx("span", { className: "mission-header__stat-label", children: pill.label })] }), _jsx("strong", { className: "mission-header__stat-value", children: pill.value })] }) }, pill.key))), _jsx("button", { type: "button", className: "mission-header__stat-pill mission-header__stat-pill--tokens", title: "Open ROI + token usage", "aria-label": `Open ROI + token usage`, onClick: onOpenTokens, children: _jsxs("div", { className: "mission-header__stat-body", children: [_jsxs("span", { className: "mission-header__stat-primary", children: [_jsx("span", { className: "mission-header__stat-label", children: "Tokens" }), _jsx("strong", { className: "mission-header__stat-value mission-header__stat-value--tokens", children: formattedTokens })] }), _jsxs("span", { className: "mission-header__stat-primary", children: [_jsx("span", { className: "mission-header__stat-label", children: "ROI" }), _jsx("strong", { className: "mission-header__stat-value mission-header__stat-value--roi", children: roi ? formatUsd(roi.totals.total_savings_usd) : '$0' })] })] }) })] }), activeDetail && (_jsx("div", { className: "mission-header__pill-detail", role: "region", "aria-live": "polite", children: _jsxs("div", { className: `mission-header__pill-detail-card mission-header__pill-detail-card--${activeDetail.pill.tone}`, children: [_jsxs("div", { className: "mission-header__pill-detail-header", children: [_jsxs("div", { children: [_jsx("p", { children: activeDetail.pill.label }), _jsx("strong", { children: activeDetail.pill.subtitle })] }), _jsx("button", { type: "button", className: "mission-header__pill-detail-close", onClick: () => setActivePill(null), "aria-label": "Hide task details", children: "\u00D7" })] }), _jsxs("ul", { className: "mission-header__pill-detail-list slice-task-list", ref: pillListRef, children: [activeDetail.tasks.length === 0 && _jsx("li", { className: "mission-header__pill-detail-empty", children: "No tasks currently in this state." }), activeDetail.tasks.map((task) => {
                                            const statusMeta = resolveStatusMeta(task.status);
                                            const isReviewTask = HEADER_REVIEW_STATUSES.has(task.status);
                                            const assignmentInfo = task.id ? assignmentInfoByTask.get(task.id) : undefined;
                                            const assignmentRecord = assignmentInfo?.assignment ?? null;
                                            const sliceName = assignmentInfo?.sliceName;
                                            const taskEvents = task.id ? eventsByTask.get(task.id) ?? [] : [];
                                            const isOpen = selectedTaskId === task.id;
                                            const tokenLabel = typeof task.metrics?.tokensUsed === "number" ? `${formatTokenCount(task.metrics.tokensUsed)} tokens` : null;
                                            const subtitle = [sliceName, tokenLabel].filter(Boolean).join(" · ");
                                            return (_jsxs("li", { className: `mission-header__pill-detail-item ${isReviewTask ? "is-review" : ""} ${isOpen ? "is-open" : ""}`, "data-task-accordion": task.id ?? undefined, children: [_jsx("button", { type: "button", onClick: () => handleTaskToggle(task.id ?? null), "aria-expanded": isOpen, children: _jsxs("div", { className: "mission-header__pill-detail-headline", children: [_jsx("span", { className: `slice-task-list__status slice-task-list__status--${statusMeta.tone}`, style: { borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }, children: statusMeta.icon }), _jsxs("div", { className: "mission-header__pill-detail-text", children: [_jsxs("div", { className: "mission-header__pill-detail-primary", children: [_jsx("span", { className: "slice-task-list__title", children: formatTaskLabel(task) }), subtitle && _jsx("span", { className: "mission-header__pill-detail-subtitle", children: subtitle })] }), _jsxs("div", { className: "mission-header__pill-detail-meta-row", children: [_jsx("span", { className: `slice-task-list__meta ${isReviewTask ? "slice-task-list__meta--review" : ""}`, style: { color: statusMeta.accent }, children: statusMeta.label }), isReviewTask && onOpenReviewTask && task.id && (_jsxs(_Fragment, { children: [_jsx("span", { className: "mission-header__pill-detail-meta-divider", "aria-hidden": "true", children: "\u00B7" }), _jsx("span", { role: "button", tabIndex: 0, className: "mission-header__review-link", onClick: (event) => {
                                                                                                event.stopPropagation();
                                                                                                onOpenReviewTask(task.id);
                                                                                            }, onKeyDown: (event) => {
                                                                                                if (event.key === "Enter" || event.key === " ") {
                                                                                                    event.preventDefault();
                                                                                                    event.stopPropagation();
                                                                                                    onOpenReviewTask(task.id);
                                                                                                }
                                                                                            }, children: "Review Now" })] }))] }), _jsx("span", { className: "mission-header__pill-detail-summary", children: formatTaskInfo(task) })] })] }) }), isOpen && (_jsx("div", { className: "slice-task-list__accordion mission-header__task-detail", children: task.id && (_jsx(TaskDetail, { task: task, assignment: assignmentRecord, events: taskEvents, onJumpToTask: handleJumpToTask, onCollapse: () => handleCollapseTask(task.id) })) }))] }, task.id ?? task.taskNumber ?? task.title ?? `task-${task.updatedAt}`));
                                        })] })] }) })), _jsxs("div", { className: "mission-progress", role: "progressbar", "aria-valuenow": progress, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Project tasks & progress", children: [_jsx("div", { className: "mission-progress__header", children: _jsxs("div", { className: "mission-progress__label", children: ["Project tasks & progress", _jsxs("span", { className: "mission-progress__value-inline", children: [progress, "%"] })] }) }), _jsx("div", { className: "mission-progress__track", children: _jsx("span", { className: "mission-progress__fill", style: { width: `${progress}%` } }) })] })] }), _jsx(VibesChatPanel, { isOpen: isVibesChatOpen, onClose: () => setIsVibesChatOpen(false) })] }));
};
export default MissionHeader;
