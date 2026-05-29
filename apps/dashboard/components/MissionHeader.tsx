import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskSnapshot, TaskStatus } from "@core/types";
import { MissionSlice, SliceAssignment, StatusSummary } from "../utils/mission";
import { MissionEvent } from "../../../src/utils/events";
import { TaskDetail } from "./modals/MissionModals";
import VibesChatPanel from "./vibes/VibesChatPanel";


interface MissionHeaderProps {
  statusSummary: StatusSummary;
  tasks: TaskSnapshot[];
  slices: MissionSlice[];
  events: MissionEvent[];
  snapshotTime: string;
  tokenUsage: number;
  agentTokens: number;
  roi: {
    totals: {
      total_savings_usd: number;
      net_savings_usd?: number;
    };
  } | null;
  onOpenTokens: () => void;
  onOpenReviewTask?: (taskId: string) => void;
}

type MissionPillTone = "pill-complete" | "pill-active" | "pill-flagged" | "pill-locked";
type HeaderPillKey = "complete" | "active" | "pending" | "review";

interface HeaderPillConfig {
  key: HeaderPillKey;
  label: string;
  description: string;
  subtitle: string;
  icon: ReactNode;
  tone: MissionPillTone;
  filter: (task: TaskSnapshot) => boolean;
}

const HEADER_COMPLETE_STATUSES = new Set<TaskStatus>(["complete", "merged", "merge_pending"]);
const HEADER_ACTIVE_STATUSES = new Set<TaskStatus>(["in_progress", "received", "review", "testing", "paused"]);
const HEADER_PENDING_STATUSES = new Set<TaskStatus>(["pending", "failed"]);
// REVIEW_STATUS is used for tasks needing human action.
// Triggered by: (1) research reports after council feedback, (2) visual UI/UX after testing agent, (3) API credit exhaustion.
// Also enriched by /api/review-queue items (research pending_human, credit alerts).
const HEADER_REVIEW_STATUSES = new Set<TaskStatus>(["human_review"]);

type HeaderStatusMeta = {
  label: string;
  tone: "complete" | "active" | "flagged" | "locked" | "default";
  icon: string;
  accent: string;
};

const HEADER_STATUS_META: Partial<Record<TaskStatus, HeaderStatusMeta>> = {
  pending: { label: "Queued", tone: "default", icon: "\u2022", accent: "#94a3b8" },
  in_progress: { label: "In Progress", tone: "active", icon: "\u21BB", accent: "#67e8f9" },
  received: { label: "Received", tone: "active", icon: "\u21BB", accent: "#86efac" },
  review: { label: "Review", tone: "active", icon: "\u2699", accent: "#a78bfa" },
  testing: { label: "Testing", tone: "active", icon: "\u2699", accent: "#facc15" },
  complete: { label: "Completed", tone: "complete", icon: "\u2713", accent: "#34d399" },
  merge_pending: { label: "Merge Pending", tone: "complete", icon: "\u23F3", accent: "#f0ad4b" },
  merged: { label: "Merged", tone: "complete", icon: "\u2713", accent: "#34d399" },
  failed: { label: "Failed", tone: "locked", icon: "\u2717", accent: "#f87171" },
  human_review: { label: "Human Review", tone: "flagged", icon: "\u26A0", accent: "#f59e0b" },
  paused: { label: "Paused", tone: "locked", icon: "\u23F8", accent: "#fbbf24" },
  cancelled: { label: "Cancelled", tone: "locked", icon: "\u2717", accent: "#6b7280" },
};

const DEFAULT_HEADER_STATUS_META: HeaderStatusMeta = {
  label: "Queued",
  tone: "default",
  icon: "\u2022",
  accent: "#a5b4fc",
};

function resolveStatusMeta(status?: TaskStatus | null): HeaderStatusMeta {
  if (!status) return DEFAULT_HEADER_STATUS_META;
  return HEADER_STATUS_META[status] ?? DEFAULT_HEADER_STATUS_META;
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) {
    const precise = value / 1_000_000;
    return `${Number.isInteger(precise) ? precise.toFixed(0) : precise.toFixed(1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}K`;
  }
  return value.toLocaleString();
}

function formatUsd(amount: number): string {
  if (amount === 0) return "$0";
  if (Math.abs(amount) < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const HEADER_PILL_CONFIGS: HeaderPillConfig[] = [
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
    icon: "\u{1F6A9}",
    tone: "pill-flagged",
    filter: (task) => HEADER_REVIEW_STATUSES.has(task.status),
  },
];

const MissionHeader: React.FC<MissionHeaderProps> = ({
  statusSummary,
  tasks,
  slices,
  events,
  snapshotTime,
  tokenUsage,
  agentTokens,
  roi,
  onOpenTokens,
  onOpenReviewTask,
}) => {
  const [activePill, setActivePill] = useState<HeaderPillKey | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [chatTrigger, setChatTrigger] = useState(false);
  const [headerMode, setHeaderMode] = useState<"live" | "project">("live");
  const [lifecycleLoading, setLifecycleLoading] = useState(false);
  const [lifecycleMsg, setLifecycleMsg] = useState<string | null>(null);
  const pillListRef = useRef<HTMLUListElement | null>(null);
  const lastCollapsedTaskRef = useRef<string | null>(null);
  const pendingScrollTaskRef = useRef<string | null>(null);

  // Review queue: unified review_items from the governor
  type ReviewQueueItem = {
    id: string;
    type: string;              // visual_qa, design_preview, research, council, credit_alert, task_review, contradiction
    category: string;          // back-compat alias for type
    source_id: string;
    title: string;
    summary: string;
    status: string;
    priority: string;          // critical, high, medium, low
    payload: Record<string, unknown>;
    review_url?: string;
    created_at?: string;
    human_notes?: string;
  };
  const [reviewQueueItems, setReviewQueueItems] = useState<ReviewQueueItem[]>([]);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());

  const govAPIBase = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://webhooks.vibestribe.rocks" : "http://localhost:8080";

  const dismissReviewItem = useCallback(async (itemId: string) => {
    setDismissing(prev => new Set(prev).add(itemId));
    try {
      const res = await fetch(`${govAPIBase}/api/review-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });
      if (res.ok) {
        setReviewQueueItems(prev => prev.filter(i => i.id !== itemId));
      }
    } catch {
      // silent fail
    } finally {
      setDismissing(prev => { const next = new Set(prev); next.delete(itemId); return next; });
    }
  }, [govAPIBase]);

  // --- Task lifecycle controls (pause-all / clear-all) ---
  const handlePauseAll = useCallback(async () => {
    setLifecycleLoading(true);
    setLifecycleMsg(null);
    try {
      const token = localStorage.getItem("governor_admin_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      const res = await fetch(`${govAPIBase}/api/tasks/pause-all`, { method: "POST", headers });
      const data = await res.json();
      if (res.ok) {
        setLifecycleMsg(`Paused ${data.paused || 0} tasks`);
      } else {
        setLifecycleMsg(data.error || "Failed");
      }
    } catch {
      setLifecycleMsg("Network error");
    } finally {
      setLifecycleLoading(false);
      setTimeout(() => setLifecycleMsg(null), 4000);
    }
  }, [govAPIBase]);

  const handleClearAll = useCallback(async () => {
    const count = activeDetail?.tasks.length ?? 0;
    if (count === 0) { setLifecycleMsg("No tasks to clear"); setTimeout(() => setLifecycleMsg(null), 2000); return; }
    if (!window.confirm(`Cancel ALL ${count} active/pending tasks? This cannot be undone.`)) return;
    setLifecycleLoading(true);
    setLifecycleMsg(null);
    try {
      const token = localStorage.getItem("governor_admin_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      const res = await fetch(`${govAPIBase}/api/tasks/clear-all`, {
        method: "POST", headers,
        body: JSON.stringify({ confirm: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setLifecycleMsg(`Cleared ${data.cleared || 0} tasks`);
      } else {
        setLifecycleMsg(data.error || "Failed");
      }
    } catch {
      setLifecycleMsg("Network error");
    } finally {
      setLifecycleLoading(false);
      setTimeout(() => setLifecycleMsg(null), 4000);
    }
  }, [govAPIBase, activeDetail]);

  // Individual task lifecycle handlers
  const govFetch = useCallback(async (endpoint: string, body?: Record<string, unknown>) => {
    const token = localStorage.getItem("governor_admin_token") || "";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    return fetch(`${govAPIBase}${endpoint}`, { method: "POST", headers, body: body ? JSON.stringify(body) : undefined });
  }, [govAPIBase]);

  const handleIndividualPause = useCallback(async (taskId: string) => {
    try { await govFetch("/api/task/pause", { task_id: taskId }); } catch {}
  }, [govFetch]);

  const handleIndividualResume = useCallback(async (taskId: string) => {
    try { await govFetch("/api/task/resume", { task_id: taskId }); } catch {}
  }, [govFetch]);

  const handleIndividualKill = useCallback(async (taskId: string) => {
    if (!window.confirm("Kill this task? This cannot be undone.")) return;
    try { await govFetch("/api/task/kill", { task_id: taskId, reason: "Killed by operator" }); } catch {}
  }, [govFetch]);

  const progress = useMemo(() => {
    if (statusSummary.total === 0) {
      return 0;
    }
    return Math.round((statusSummary.completed / statusSummary.total) * 100);
  }, [statusSummary.completed, statusSummary.total]);

  const taskBuckets = useMemo<Record<HeaderPillKey, number>>(() => {
    const counts: Record<HeaderPillKey, number> = { complete: 0, active: 0, pending: 0, review: 0 };
    tasks.forEach((task) => {
      const status = task.status;
      if (HEADER_COMPLETE_STATUSES.has(status)) counts.complete += 1;
      if (HEADER_ACTIVE_STATUSES.has(status)) counts.active += 1;
      if (HEADER_PENDING_STATUSES.has(status)) counts.pending += 1;
      if (HEADER_REVIEW_STATUSES.has(status)) counts.review += 1;
    });
    return counts;
  }, [tasks]);

  const pills = useMemo(() => {
    const totalTasks = statusSummary.total;
    return HEADER_PILL_CONFIGS.map((pill) => ({
      ...pill,
      value: pill.key === "complete"
        ? `${taskBuckets.complete}/${totalTasks}`
        : pill.key === "review"
          ? taskBuckets.review + reviewQueueItems.length
          : taskBuckets[pill.key],
    }));
  }, [statusSummary.total, taskBuckets, reviewQueueItems]);

  const activeDetail = useMemo(() => {
    if (!activePill) return null;
    const pill = pills.find((candidate) => candidate.key === activePill);
    if (!pill) return null;
    const detailedTasks = tasks.filter(pill.filter);
    return {
      pill,
      tasks: detailedTasks,
    };
  }, [activePill, pills, tasks]);

  const assignmentInfoByTask = useMemo(() => {
    const map = new Map<
      string,
      {
        assignment: SliceAssignment | null;
        sliceName: string;
      }
    >();
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
    const map = new Map<string, MissionEvent[]>();
    events.forEach((event) => {
      if (!event.taskId) return;
      if (!map.has(event.taskId)) {
        map.set(event.taskId, []);
      }
      map.get(event.taskId)!.push(event);
    });
    return map;
  }, [events]);

  const scrollTaskIntoView = useCallback(
    (taskId: string, behavior: ScrollBehavior = "smooth", block: ScrollLogicalPosition = "nearest") => {
      if (!pillListRef.current) return;
      const target = pillListRef.current.querySelector<HTMLElement>(`[data-task-accordion="${taskId}"]`);
      target?.scrollIntoView({ behavior, block });
    },
    []
  );

  const handleTaskToggle = (taskId?: string | null) => {
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
    if (!selectedTaskId || !pillListRef.current) return;
    if (pendingScrollTaskRef.current === selectedTaskId) {
      scrollTaskIntoView(selectedTaskId, "smooth", "start");
      pendingScrollTaskRef.current = null;
    }
  }, [selectedTaskId, scrollTaskIntoView]);

  useEffect(() => {
    if (selectedTaskId !== null || !lastCollapsedTaskRef.current) return;
    const taskId = lastCollapsedTaskRef.current;
    lastCollapsedTaskRef.current = null;
    if (taskId) {
      requestAnimationFrame(() => scrollTaskIntoView(taskId, "auto", "start"));
    }
  }, [selectedTaskId, scrollTaskIntoView]);

  const handleCollapseTask = (taskId?: string | null) => {
    if (taskId) {
      lastCollapsedTaskRef.current = taskId;
    }
    setSelectedTaskId(null);
  };

  const handleJumpToTask = (targetId: string) => {
    pendingScrollTaskRef.current = targetId;
    setSelectedTaskId(targetId);
  };

  const formatTaskLabel = (task: TaskSnapshot) => {
    if (task.taskNumber) {
      const cleaned = String(task.taskNumber).replace(/task\s*#/i, "").replace(/^#/i, "").trim();
      return cleaned ? `Task #${cleaned}` : "Task";
    }
    return task.title ?? task.id ?? "Task";
  };

  const formatTaskInfo = (task: TaskSnapshot) => {
    if (task.summary) return task.summary;
    if (task.title) return task.title;
    return task.status.replace(/_/g, " ");
  };

  const formattedTokens = useMemo(() => formatTokenCount(tokenUsage), [tokenUsage]);

  // Project totals from localStorage (same key as ProjectTracker in MissionModals)
  const projectTokens = useMemo(() => {
    try {
      const raw = localStorage.getItem("vibepilot_project_roi");
      if (raw) {
        const data = JSON.parse(raw);
        return data?.totals?.totalTokens ?? 0;
      }
    } catch { /* ignore */ }
    return 0;
  }, [tokenUsage]); // re-read when live tokens change

  const displayTokens = headerMode === "project" 
    ? Math.max(projectTokens, tokenUsage) + agentTokens
    : tokenUsage;  // now = live pipeline tasks
  const formattedDisplayTokens = useMemo(() => formatTokenCount(displayTokens), [displayTokens]);

  // Fetch subscription/credit threshold alerts
  const [alerts, setAlerts] = useState<Array<{ model_id: string; alert_type: string; message: string }>>([]);
  useEffect(() => {
    const fetchAlerts = () => {
    const govAPI = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://webhooks.vibestribe.rocks" : "http://localhost:8080";
    fetch(`${govAPI}/api/project/alerts`)
        .then(r => r.ok ? r.json() : { alerts: [] })
        .then(data => setAlerts(data.alerts || []))
        .catch(() => {});
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000); // check every minute

    // Fetch unified review queue (research reports, visual QA, credit alerts)
    const fetchReviewQueue = () => {
    const govAPI = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://webhooks.vibestribe.rocks" : "http://localhost:8080";
    fetch(`${govAPI}/api/review-items?status=pending`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setReviewQueueItems(Array.isArray(data) ? data : []))
        .catch(() => {});
    };
    fetchReviewQueue();
    const reviewInterval = setInterval(fetchReviewQueue, 60_000);

    return () => { clearInterval(interval); clearInterval(reviewInterval); };
  }, []);

  return (
    <header className="mission-header">
      <div className="mission-header__identity">
        <button
          className="vibes-orb vibes-orb--interactive"
          onClick={() => setChatTrigger(true)}
          aria-label="Open Vibes chat"
          title="Chat with Vibes"
        >
          <span className="vibes-orb__label">Vibes</span>
          <span className="vibes-orb__text-label">Text me</span>
        </button>
        <div className="mission-header__titles">
          <p className="mission-header__eyebrow">
            <span>Mission Control</span>
            <span className="mission-header__separator" aria-hidden="true">
              {"\u00B7"}
            </span>
            <span className="mission-header__brand">Vibeflow</span>
          </p>
          <p className="mission-header__subtitle">Live orchestrations, telemetry, and ROI tracking at a glance.</p>
        </div>
      </div>
      <div className="mission-header__content">
        <div className="mission-header__tasks-row" role="group" aria-label="Mission snapshot">
        {pills.map((pill) => (
          <button
            key={pill.key}
            type="button"
            className={`mission-header__stat-pill mission-header__stat-pill--${pill.tone}`}
            title={pill.description}
            aria-label={`${pill.label}: ${pill.value}`}
            aria-expanded={activePill === pill.key}
            data-active={activePill === pill.key ? "true" : "false"}
            onClick={() => setActivePill((prev) => (prev === pill.key ? null : pill.key))}
          >
              <div className="mission-header__stat-body">
                <span className="mission-header__stat-primary">
                  <span className="mission-header__stat-icon" aria-hidden="true">
                    {pill.icon}
                  </span>
                  <span className="mission-header__stat-label">{pill.label}</span>
                </span>
                <strong className="mission-header__stat-value">{pill.value}</strong>
            </div>
          </button>
        ))}
        <button
          type="button"
          className="mission-header__stat-pill mission-header__stat-pill--tokens"
          title="Open ROI + token usage"
          aria-label="Open ROI + token usage"
          onClick={onOpenTokens}
        >
          <div className="mission-header__stat-body">
            <span className="mission-header__stat-primary">
              <span
                className="mission-header__mode-toggle"
                title={headerMode === "project" ? "Showing project totals – click to switch to live" : "Showing live tokens – click to switch to project"}
                onClick={(e) => {
                  e.stopPropagation();
                  setHeaderMode(headerMode === "live" ? "project" : "live");
                }}
              >
                {headerMode === "project" ? "Project" : "Now"}
              </span>
              <strong className="mission-header__stat-value mission-header__stat-value--tokens">{formattedDisplayTokens}</strong>
            </span>
            <span className="mission-header__stat-primary">
              <span className="mission-header__stat-label">ROI</span>
              <strong className="mission-header__stat-value mission-header__stat-value--roi">{roi ? formatUsd(roi.totals.net_savings_usd ?? roi.totals.total_savings_usd) : '$0'}</strong>
            </span>
          </div>
        </button>
      </div>
        {activeDetail && (
          <div className="mission-header__pill-detail" role="region" aria-live="polite">
            <div className={`mission-header__pill-detail-card mission-header__pill-detail-card--${activeDetail.pill.tone}`}>
              <div className="mission-header__pill-detail-header">
                <div>
                  <p>{activeDetail.pill.label}</p>
                  <strong>{activeDetail.pill.subtitle}</strong>
                </div>
                <button type="button" className="mission-header__pill-detail-close" onClick={() => setActivePill(null)} aria-label="Hide task details">
                  {"\u00D7"}
                </button>
              </div>
              {/* Task Lifecycle Controls: Pause All / Clear All for Active & Pending pills */}
              {(activeDetail.pill.key === "active" || activeDetail.pill.key === "pending") && (
                <div style={{ display: "flex", gap: "6px", padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    disabled={lifecycleLoading}
                    onClick={handlePauseAll}
                    style={{
                      fontSize: "0.75rem",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      border: "1px solid rgba(251,191,36,0.4)",
                      background: "rgba(251,191,36,0.12)",
                      color: "#fbbf24",
                      cursor: lifecycleLoading ? "wait" : "pointer",
                      opacity: lifecycleLoading ? 0.6 : 1,
                    }}
                  >
                    {lifecycleLoading ? "..." : "\u23F8 Pause All"}
                  </button>
                  <button
                    type="button"
                    disabled={lifecycleLoading}
                    onClick={handleClearAll}
                    style={{
                      fontSize: "0.75rem",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      border: "1px solid rgba(248,113,113,0.4)",
                      background: "rgba(248,113,113,0.12)",
                      color: "#f87171",
                      cursor: lifecycleLoading ? "wait" : "pointer",
                      opacity: lifecycleLoading ? 0.6 : 1,
                    }}
                  >
                    {lifecycleLoading ? "..." : "\u2717 Clear All"}
                  </button>
                  {lifecycleMsg && (
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", alignSelf: "center", marginLeft: "4px" }}>
                      {lifecycleMsg}
                    </span>
                  )}
                </div>
              )}
              {/* Unified Review Items */}
              {activeDetail.pill.key === "review" && reviewQueueItems.length > 0 && (
                <ul className="mission-header__pill-detail-list slice-task-list" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "8px", marginBottom: "4px" }}>
                  {(() => {
                    const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
                      research:       { label: "Research Reports", color: "#a78bfa", icon: "🔬" },
                      visual_qa:      { label: "Visual QA", color: "#60a5fa", icon: "👁" },
                      design_preview: { label: "Design Previews", color: "#f472b6", icon: "🎨" },
                      council:        { label: "Council Splits", color: "#fbbf24", icon: "⚖" },
                      credit_alert:   { label: "Credit Alerts", color: "#f87171", icon: "💳" },
                      task_review:    { label: "Task Reviews", color: "#34d399", icon: "✅" },
                      contradiction:  { label: "Contradictions", color: "#fb923c", icon: "⚡" },
                    };
                    const PRIORITY_BADGE: Record<string, { label: string; color: string }> = {
                      critical: { label: "CRITICAL", color: "#ef4444" },
                      high:     { label: "HIGH", color: "#f59e0b" },
                      medium:   { label: "MED", color: "#6b7280" },
                      low:      { label: "LOW", color: "#4b5563" },
                    };
                    const grouped = reviewQueueItems.reduce((acc, item) => {
                      const t = item.type || item.category;
                      if (!acc[t]) acc[t] = [];
                      acc[t].push(item);
                      return acc;
                    }, {} as Record<string, ReviewQueueItem[]>);
                    return Object.entries(grouped).map(([type, items]) => {
                      const meta = TYPE_META[type] ?? { label: type, color: "#94a3b8", icon: "📋" };
                      return (
                        <React.Fragment key={type}>
                          <li style={{ padding: "4px 8px", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: meta.color, fontWeight: 600, marginTop: type === Object.keys(grouped)[0] ? 0 : "4px" }}>
                            {meta.icon} {meta.label} ({items.length})
                          </li>
                          {items.map((item) => {
                            const pri = PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.medium;
                            return (
                              <li key={item.id} className="mission-header__pill-detail-item is-review" style={{ padding: "6px 8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                                  <span style={{ fontSize: "0.9rem", color: meta.color, flex: 1 }}>
                                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                                    {item.summary && <span style={{ display: "block", color: "#c8d6e5", marginTop: "2px" }}>{item.summary}</span>}
                                    <span style={{ display: "inline-block", marginTop: "2px", fontSize: "0.75rem", padding: "1px 4px", borderRadius: "3px", background: `${pri.color}22`, color: pri.color, border: `1px solid ${pri.color}44` }}>{pri.label}</span>
                                  </span>
                                  {item.type === "research" || item.category === "research" ? (() => {
                                      const kbUrl = (item.source_id) ? `https://graphs.vibestribe.rocks/#research-${item.source_id}` : "";
                                      return kbUrl ? (
                                        <a href={kbUrl} target="_blank" rel="noopener noreferrer"
                                           style={{ fontSize: "0.9rem", color: "#f59e0b", whiteSpace: "nowrap", textDecoration: "underline", cursor: "pointer" }}
                                           onClick={(e) => e.stopPropagation()}
                                        >
                                          Review
                                        </a>
                                      ) : null;
                                    })() : item.review_url ? (
                                    <a href={item.review_url} target="_blank" rel="noopener noreferrer"
                                       style={{ fontSize: "0.9rem", color: "#f59e0b", whiteSpace: "nowrap", textDecoration: "underline", cursor: "pointer" }}>
                                      Review
                                    </a>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={dismissing.has(item.id)}
                                    onClick={(e) => { e.stopPropagation(); dismissReviewItem(item.id); }}
                                    title="Mark as reviewed and remove from queue"
                                    style={{ fontSize: "0.75rem", color: "#94a3b8", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "4px", padding: "2px 8px", cursor: dismissing.has(item.id) ? "wait" : "pointer", whiteSpace: "nowrap", opacity: dismissing.has(item.id) ? 0.5 : 1 }}
                                  >
                                    {dismissing.has(item.id) ? "..." : "Done"}
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </React.Fragment>
                      );
                    });
                  })()}
                </ul>
              )}
              <ul className="mission-header__pill-detail-list slice-task-list" ref={pillListRef}>
                {activeDetail.tasks.length === 0 && reviewQueueItems.length === 0 && <li className="mission-header__pill-detail-empty">No items currently in this state.</li>}
                {activeDetail.tasks.map((task) => {
                  const statusMeta = resolveStatusMeta(task.status);
                  const isReviewTask = HEADER_REVIEW_STATUSES.has(task.status);
                  const assignmentInfo = task.id ? assignmentInfoByTask.get(task.id) : undefined;
                  const assignmentRecord = assignmentInfo?.assignment ?? null;
                  const sliceName = assignmentInfo?.sliceName;
                  const taskEvents = task.id ? eventsByTask.get(task.id) ?? [] : [];
                  const isOpen = selectedTaskId === task.id;
                  const tokenLabel =
                    typeof task.metrics?.tokensUsed === "number" ? `${formatTokenCount(task.metrics.tokensUsed)} tokens` : null;
                  const subtitle = [sliceName, tokenLabel].filter(Boolean).join(" · ");
                  return (
                    <li
                      key={task.id ?? task.taskNumber ?? task.title ?? `task-${task.updatedAt}`}
                      className={`mission-header__pill-detail-item ${isReviewTask ? "is-review" : ""} ${isOpen ? "is-open" : ""}`}
                      data-task-accordion={task.id ?? undefined}
                    >
                      <button
                        type="button"
                        onClick={() => handleTaskToggle(task.id ?? null)}
                        aria-expanded={isOpen}
                      >
                        <div className="mission-header__pill-detail-headline">
                          <span
                            className={`slice-task-list__status slice-task-list__status--${statusMeta.tone}`}
                            style={{ borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }}
                          >
                            {statusMeta.icon}
                          </span>
                          <div className="mission-header__pill-detail-text">
                            <div className="mission-header__pill-detail-primary">
                              <span className="slice-task-list__title">{formatTaskLabel(task)}</span>
                              {subtitle && <span className="mission-header__pill-detail-subtitle">{subtitle}</span>}
                            </div>
                            <div className="mission-header__pill-detail-meta-row">
                          <span
                            className={`slice-task-list__meta ${isReviewTask ? "slice-task-list__meta--review" : ""}`}
                            style={{ color: statusMeta.accent }}
                          >
                            {statusMeta.label}
                          </span>
                              {isReviewTask && onOpenReviewTask && task.id && (
                            <>
                              <span className="mission-header__pill-detail-meta-divider" aria-hidden="true">
                                {"\u00B7"}
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                className="mission-header__review-link"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenReviewTask(task.id!);
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onOpenReviewTask(task.id!);
                                  }
                                }}
                              >
                                Review Now
                              </span>
                            </>
                          )}
                            </div>
                            <span className="mission-header__pill-detail-summary">{formatTaskInfo(task)}</span>
                          </div>
                        </div>
                      </button>
                      {/* Per-task lifecycle controls */}
                      {task.id && task.status !== "merged" && task.status !== "complete" && task.status !== "cancelled" && (
                        <div style={{ display: "flex", gap: "4px", padding: "2px 8px 4px 32px" }}>
                          {task.status === "paused" ? (
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleIndividualResume(task.id!); }}
                              style={{ fontSize: "0.7rem", padding: "1px 8px", borderRadius: "3px", border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.12)", color: "#34d399", cursor: "pointer" }}>
                              Resume
                            </button>
                          ) : (
                            <button type="button" onClick={(e) => { e.stopPropagation(); handleIndividualPause(task.id!); }}
                              style={{ fontSize: "0.7rem", padding: "1px 8px", borderRadius: "3px", border: "1px solid rgba(251,191,36,0.4)", background: "rgba(251,191,36,0.12)", color: "#fbbf24", cursor: "pointer" }}>
                              Pause
                            </button>
                          )}
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleIndividualKill(task.id!); }}
                            style={{ fontSize: "0.7rem", padding: "1px 8px", borderRadius: "3px", border: "1px solid rgba(248,113,113,0.4)", background: "rgba(248,113,113,0.12)", color: "#f87171", cursor: "pointer" }}>
                            Kill
                          </button>
                        </div>
                      )}
                      {isOpen && (
                        <div className="slice-task-list__accordion mission-header__task-detail">
                          {task.id && (
                            <TaskDetail
                              task={task}
                              assignment={assignmentRecord}
                              events={taskEvents}
                              onJumpToTask={handleJumpToTask}
                              onCollapse={() => handleCollapseTask(task.id)}
                            />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
        <div
          className="mission-progress"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Project tasks & progress"
        >
          <div className="mission-progress__header">
            <div className="mission-progress__label">
              Project tasks &amp; progress
              <span className="mission-progress__value-inline">{progress}%</span>
            </div>
          </div>
          <div className="mission-progress__track">
            <span className="mission-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <VibesChatPanel externalOpen={chatTrigger} onExternalClose={() => setChatTrigger(false)} />
    </header>
  );
};

export default MissionHeader;

