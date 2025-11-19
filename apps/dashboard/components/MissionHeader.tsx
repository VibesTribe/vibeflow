import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskSnapshot, TaskStatus } from "@core/types";
import { MissionSlice, SliceAssignment, StatusSummary } from "../utils/mission";
import { MissionEvent } from "../../../src/utils/events";
import { TaskDetail } from "./modals/MissionModals";

interface MissionHeaderProps {
  statusSummary: StatusSummary;
  tasks: TaskSnapshot[];
  slices: MissionSlice[];
  events: MissionEvent[];
  snapshotTime: string;
  tokenUsage: number;
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

const HEADER_COMPLETE_STATUSES = new Set<TaskStatus>(["complete", "ready_to_merge", "supervisor_approval"]);
const HEADER_ACTIVE_STATUSES = new Set<TaskStatus>(["assigned", "in_progress", "received", "testing"]);
const HEADER_PENDING_STATUSES = new Set<TaskStatus>(["assigned", "blocked"]);
const HEADER_REVIEW_STATUSES = new Set<TaskStatus>(["supervisor_review"]);

type HeaderStatusMeta = {
  label: string;
  tone: "complete" | "active" | "flagged" | "locked" | "default";
  icon: string;
  accent: string;
};

const HEADER_STATUS_META: Partial<Record<TaskStatus, HeaderStatusMeta>> = {
  assigned: { label: "Assigned", tone: "active", icon: "\u21BB", accent: "#60a5fa" },
  in_progress: { label: "In Progress", tone: "active", icon: "\u21BB", accent: "#67e8f9" },
  received: { label: "Received", tone: "active", icon: "\u21BB", accent: "#86efac" },
  testing: { label: "Testing", tone: "active", icon: "\u2699", accent: "#facc15" },
  supervisor_review: { label: "Needs Review", tone: "flagged", icon: "\u{1F6A9}", accent: "#ff3b6f" },
  ready_to_merge: { label: "Ready to Merge", tone: "complete", icon: "\u2713", accent: "#34d399" },
  supervisor_approval: { label: "Approved", tone: "complete", icon: "\u2713", accent: "#34d399" },
  complete: { label: "Completed", tone: "complete", icon: "\u2713", accent: "#34d399" },
  blocked: { label: "Pending", tone: "locked", icon: "\u23F3", accent: "#facc15" },
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
    description: "Needs human approval",
    subtitle: "Needs review",
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
  onOpenTokens,
  onOpenReviewTask,
}) => {
  const [activePill, setActivePill] = useState<HeaderPillKey | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const pillListRef = useRef<HTMLUListElement | null>(null);
  const lastCollapsedTaskRef = useRef<string | null>(null);
  const pendingScrollTaskRef = useRef<string | null>(null);

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
    const totalTasks = Math.max(statusSummary.total, 1);
    return HEADER_PILL_CONFIGS.map((pill) => ({
      ...pill,
      value: pill.key === "complete" ? `${taskBuckets.complete}/${totalTasks}` : taskBuckets[pill.key],
    }));
  }, [statusSummary.total, taskBuckets]);

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

  return (
    <header className="mission-header">
      <div className="mission-header__identity">
        <span className="vibes-orb" aria-hidden="true">
          <span className="vibes-orb__label">Vibes</span>
        </span>
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
              <span className="mission-header__stat-primary">
                <span className="mission-header__stat-icon" aria-hidden="true">
                  {pill.icon}
                </span>
                <span className="mission-header__stat-label">{pill.label}</span>
              </span>
              <strong className="mission-header__stat-value">{pill.value}</strong>
            </button>
          ))}
          <button
            type="button"
            className="mission-header__stat-pill mission-header__stat-pill--tokens"
            title="Open ROI + token usage"
            aria-label={`Open ROI + token usage: ${formattedTokens} tokens`}
            onClick={onOpenTokens}
          >
            <span className="mission-header__stat-primary">
              <span className="mission-header__stat-label">Tokens</span>
            </span>
            <strong className="mission-header__stat-value">{formattedTokens}</strong>
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
              <ul className="mission-header__pill-detail-list slice-task-list" ref={pillListRef}>
                {activeDetail.tasks.length === 0 && <li className="mission-header__pill-detail-empty">No tasks currently in this state.</li>}
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
            <div className="mission-progress__label">Project tasks &amp; progress</div>
            <div className="mission-progress__meta">
              <span className="mission-progress__value">{progress}%</span>
              <span className="mission-header__timestamp mission-progress__timestamp" aria-label="Last snapshot time">
                {snapshotTime}
              </span>
              <button
                type="button"
                className="mission-progress__tokens-inline"
                onClick={onOpenTokens}
                aria-label={`Open ROI + token usage: ${formattedTokens} tokens`}
              >
                <strong>{formattedTokens}</strong>
                <span>tokens</span>
              </button>
            </div>
          </div>
          <div className="mission-progress__track">
            <span className="mission-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default MissionHeader;

