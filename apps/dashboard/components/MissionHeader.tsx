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
  updateTaskStatus?: (taskId: string, newStatus: string) => void;
  bulkUpdateTaskStatus?: (newStatus: string, fromStatuses: string[]) => void;
  selectedProjectSlug?: string;
  onProjectChange?: (slug: string) => void;
}

interface ProjectInfo {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  status: string;
  theme?: {
    accent_color?: string;
    brand_name?: string;
  } | null;
  deploy_url?: string | null;
  github_owner?: string | null;
  github_repo?: string | null;
  total_tasks?: number;
  completed_tasks?: number;
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
const HEADER_ACTIVE_STATUSES = new Set<TaskStatus>(["in_progress", "received", "review", "testing"]);
const HEADER_PENDING_STATUSES = new Set<TaskStatus>(["pending", "failed", "paused"]);
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
  paused: { label: "Paused", tone: "locked", icon: "\u23F8", accent: "#d29922" },
  cancelled: { label: "Abandoned", tone: "locked", icon: "\u2717", accent: "#6b7280" },
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
  updateTaskStatus,
  bulkUpdateTaskStatus,
  selectedProjectSlug,
  onProjectChange,
}) => {
  const [activePill, setActivePill] = useState<HeaderPillKey | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [chatTrigger, setChatTrigger] = useState(false);
  const [askVibesMessage, setAskVibesMessage] = useState<string | undefined>(undefined);
  const [headerMode, setHeaderMode] = useState<"live" | "project">("live");
  const [projectList, setProjectList] = useState<ProjectInfo[]>([]);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const pillListRef = useRef<HTMLUListElement | null>(null);
  const lastCollapsedTaskRef = useRef<string | null>(null);
  const pendingScrollTaskRef = useRef<string | null>(null);
  const projectMenuRef = useRef<HTMLDivElement | null>(null);

  // Fetch projects list on mount
  useEffect(() => {
    const govAPI = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
      ? "https://webhooks.vibestribe.rocks" : "http://localhost:8080";
    fetch(`${govAPI}/api/projects`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setProjectList(data);
        }
      })
      .catch(() => {});
  }, []);

  // Close project menu on outside click
  useEffect(() => {
    if (!projectMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(e.target as Node)) {
        setProjectMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [projectMenuOpen]);

  const handleProjectSelect = useCallback((slug: string) => {
    setProjectMenuOpen(false);
    if (slug !== selectedProjectSlug && onProjectChange) {
      onProjectChange(slug);
      if (typeof window !== "undefined") {
        localStorage.setItem("vp_selected_project", slug);
      }
    }
  }, [selectedProjectSlug, onProjectChange]);

  const currentProject = useMemo(() => {
    return projectList.find(p => p.slug === selectedProjectSlug) || null;
  }, [projectList, selectedProjectSlug]);

  // Listen for "ask-vibes" custom events from ResearchReportPanel or other components
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      if (detail) {
        setAskVibesMessage(detail);
        setChatTrigger(true);
      }
    };
    window.addEventListener('ask-vibes', handler);
    return () => window.removeEventListener('ask-vibes', handler);
  }, []);

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

  // Task control state
  const [taskActionLoading, setTaskActionLoading] = useState<Set<string>>(new Set());
  const [taskActionResult, setTaskActionResult] = useState<string | null>(null);

  const callTaskControl = useCallback(async (endpoint: string, body: Record<string, unknown>) => {
    setTaskActionResult(null);
    try {
      const token = localStorage.getItem("governor_admin_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;
      const res = await fetch(`${govAPIBase}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTaskActionResult(data.message || "OK");
        return true;
      }
      setTaskActionResult("Error: " + (data.error || res.statusText));
      return false;
    } catch (e: any) {
      setTaskActionResult("Error: " + (e.message || "Network error"));
      return false;
    }
  }, [govAPIBase]);

  const handleTaskAction = useCallback(async (action: string, taskId: string) => {
    setTaskActionLoading(prev => new Set(prev).add(taskId));
    const ok = await callTaskControl(`/api/task/${action}`, { task_id: taskId });
    setTaskActionLoading(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    if (ok) {
      // Optimistic local update — reflect the change in UI immediately
      // without waiting for a server refresh round-trip
      const statusMap: Record<string, string> = {
        kill: "cancelled",
        pause: "paused",
        resume: "pending",
      };
      const newStatus = statusMap[action];
      if (newStatus && updateTaskStatus) {
        updateTaskStatus(taskId, newStatus);
      }
    }
  }, [callTaskControl, updateTaskStatus]);

  const handleBulkAction = useCallback(async (action: string) => {
    setTaskActionLoading(prev => new Set(prev).add("__bulk__"));
    const body = action === "clear-all" ? { confirm: true } : {};
    const ok = await callTaskControl(`/api/tasks/${action}`, body);
    setTaskActionLoading(prev => { const n = new Set(prev); n.delete("__bulk__"); return n; });
    if (ok && bulkUpdateTaskStatus) {
      // Optimistic bulk update so UI reflects changes immediately
      if (action === "pause-all") {
        bulkUpdateTaskStatus("paused", ["pending", "in_progress", "received", "review", "testing"]);
      } else if (action === "clear-all") {
        bulkUpdateTaskStatus("cancelled", ["pending", "in_progress", "received", "review", "testing", "paused", "failed"]);
      } else if (action === "resume-all") {
        bulkUpdateTaskStatus("pending", ["paused"]);
      }
    }
  }, [callTaskControl, bulkUpdateTaskStatus]);

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
            {projectList.length > 1 ? (
              <div className="mission-header__project-selector" ref={projectMenuRef}>
                <button
                  type="button"
                  className="mission-header__brand mission-header__brand--selectable"
                  onClick={() => setProjectMenuOpen(prev => !prev)}
                  aria-label="Switch project"
                >
                  {currentProject?.display_name || selectedProjectSlug || "VibePilot"}
                  <span className="mission-header__project-caret" aria-hidden="true">{"\u25BE"}</span>
                </button>
                {projectMenuOpen && (
                  <div className="mission-header__project-menu" role="menu">
                    {projectList.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`mission-header__project-option${p.slug === selectedProjectSlug ? " mission-header__project-option--active" : ""}`}
                        onClick={() => handleProjectSelect(p.slug)}
                        role="menuitem"
                      >
                        <span className="mission-header__project-name">{p.display_name || p.slug}</span>
                        {p.total_tasks != null && (
                          <span className="mission-header__project-stats">{p.completed_tasks ?? 0}/{p.total_tasks}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="mission-header__brand">{currentProject?.display_name || "VibePilot"}</span>
            )}
          </p>
          <p className="mission-header__subtitle">{currentProject?.description || "Live orchestrations, telemetry, and ROI tracking at a glance."}</p>
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
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {/* Task control bulk actions for Active/Pending */}
                  {(activeDetail.pill.key === "active" || activeDetail.pill.key === "pending") && activeDetail.tasks.length > 0 && (
                    <>
                      {(activeDetail.pill.key === "pending") && (
                        <button
                          type="button"
                          disabled={taskActionLoading.has("__bulk__")}
                          onClick={() => handleBulkAction("resume-all")}
                          title="Resume all paused tasks"
                          style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(63,185,80,0.12)", border: "1px solid rgba(63,185,80,0.35)", borderRadius: 4, color: "#3fb950", cursor: taskActionLoading.has("__bulk__") ? "wait" : "pointer", whiteSpace: "nowrap" }}
                        >
                          {taskActionLoading.has("__bulk__") ? "..." : "Resume All"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={taskActionLoading.has("__bulk__")}
                        onClick={() => handleBulkAction("pause-all")}
                        title={activeDetail.pill.key === "active" ? "Pause all active tasks" : "Pause all pending tasks"}
                        style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(210,153,34,0.15)", border: "1px solid rgba(210,153,34,0.4)", borderRadius: 4, color: "#d29922", cursor: taskActionLoading.has("__bulk__") ? "wait" : "pointer", whiteSpace: "nowrap" }}
                      >
                        {taskActionLoading.has("__bulk__") ? "..." : "Pause All"}
                      </button>
                      <button
                        type="button"
                        disabled={taskActionLoading.has("__bulk__")}
                        onClick={() => { if (confirm("Cancel ALL active tasks? This cannot be undone.")) handleBulkAction("clear-all"); }}
                        title="Cancel all non-completed tasks"
                        style={{ fontSize: "0.7rem", padding: "3px 8px", background: "rgba(248,81,73,0.12)", border: "1px solid rgba(248,81,73,0.35)", borderRadius: 4, color: "#f87171", cursor: taskActionLoading.has("__bulk__") ? "wait" : "pointer", whiteSpace: "nowrap" }}
                      >
                        {taskActionLoading.has("__bulk__") ? "..." : "Kill All"}
                      </button>
                    </>
                  )}
                  <button type="button" className="mission-header__pill-detail-close" onClick={() => setActivePill(null)} aria-label="Hide task details">
                    {"\u00D7"}
                  </button>
                </div>
              </div>
              {/* Task action result toast */}
              {taskActionResult && (
                <div style={{ padding: "4px 10px", fontSize: "0.75rem", background: taskActionResult.startsWith("Error") ? "rgba(248,81,73,0.12)" : "rgba(63,185,80,0.12)", color: taskActionResult.startsWith("Error") ? "#f87171" : "#3fb950", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {taskActionResult}
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
                        {/* Per-task control buttons for Active/Pending pills */}
                        {(activeDetail.pill.key === "active" || activeDetail.pill.key === "pending") && task.id && (
                          <div style={{ display: "flex", gap: 4, marginTop: 6, paddingLeft: 2 }} onClick={(e) => e.stopPropagation()}>
                            {task.status === "paused" ? (
                              <button type="button" disabled={taskActionLoading.has(task.id)}
                                onClick={() => handleTaskAction("resume", task.id!)}
                                style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(63,185,80,0.12)", border: "1px solid rgba(63,185,80,0.35)", borderRadius: 4, color: "#3fb950", cursor: taskActionLoading.has(task.id) ? "wait" : "pointer" }}>
                                {taskActionLoading.has(task.id) ? "..." : "Resume"}
                              </button>
                            ) : (
                              <button type="button" disabled={taskActionLoading.has(task.id)}
                                onClick={() => handleTaskAction("pause", task.id!)}
                                style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(210,153,34,0.12)", border: "1px solid rgba(210,153,34,0.35)", borderRadius: 4, color: "#d29922", cursor: taskActionLoading.has(task.id) ? "wait" : "pointer" }}>
                                {taskActionLoading.has(task.id) ? "..." : "Pause"}
                              </button>
                            )}
                            <button type="button" disabled={taskActionLoading.has(task.id)}
                              onClick={() => { if (confirm("Kill this task?")) handleTaskAction("kill", task.id!); }}
                              style={{ fontSize: "0.7rem", padding: "2px 8px", background: "rgba(248,81,73,0.1)", border: "1px solid rgba(248,81,73,0.3)", borderRadius: 4, color: "#f87171", cursor: taskActionLoading.has(task.id) ? "wait" : "pointer" }}>
                              {taskActionLoading.has(task.id) ? "..." : "Kill"}
                            </button>
                          </div>
                        )}
                      </button>
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
      <VibesChatPanel externalOpen={chatTrigger} onExternalClose={() => { setChatTrigger(false); setAskVibesMessage(undefined); }} initialMessage={askVibesMessage} />
    </header>
  );
};

export default MissionHeader;

