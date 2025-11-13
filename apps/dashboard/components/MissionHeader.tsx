import React, { ReactNode, useMemo, useState } from "react";
import { TaskSnapshot, TaskStatus } from "@core/types";
import { StatusSummary } from "../utils/mission";

export interface MissionTaskStats {
  total: number;
  completed: number;
  active: number;
  flagged: number;
  locked: number;
}

interface MissionHeaderProps {
  statusSummary: StatusSummary;
  taskStats: MissionTaskStats;
  tasks: TaskSnapshot[];
  snapshotTime: string;
  tokenUsage: number;
  onOpenTokens: () => void;
}

type MissionPillTone = "pill-complete" | "pill-active" | "pill-flagged" | "pill-locked";
type HeaderPillKey = "complete" | "active" | "pending" | "review";

interface HeaderPillConfig {
  key: HeaderPillKey;
  label: string;
  description: string;
  icon: ReactNode;
  tone: MissionPillTone;
  filter: (task: TaskSnapshot) => boolean;
}

const HEADER_COMPLETE_STATUSES = new Set<TaskStatus>(["complete", "ready_to_merge", "supervisor_approval"]);
const HEADER_ACTIVE_STATUSES = new Set<TaskStatus>(["assigned", "in_progress", "received", "testing"]);
const HEADER_PENDING_STATUSES = new Set<TaskStatus>(["assigned", "blocked"]);
const HEADER_REVIEW_STATUSES = new Set<TaskStatus>(["supervisor_review"]);

const HEADER_PILL_CONFIGS: HeaderPillConfig[] = [
  {
    key: "complete",
    label: "Complete",
    description: "Completed tasks vs mission total",
    icon: "\u2713",
    tone: "pill-complete",
    filter: (task) => HEADER_COMPLETE_STATUSES.has(task.status),
  },
  {
    key: "active",
    label: "Active",
    description: "Currently active mission tasks",
    icon: "\u21BB",
    tone: "pill-active",
    filter: (task) => HEADER_ACTIVE_STATUSES.has(task.status),
  },
  {
    key: "pending",
    label: "Pending",
    description: "Waiting on dependencies",
    icon: "\u23F3",
    tone: "pill-locked",
    filter: (task) => HEADER_PENDING_STATUSES.has(task.status),
  },
  {
    key: "review",
    label: "Review",
    description: "Needs human approval",
    icon: "\u2691",
    tone: "pill-flagged",
    filter: (task) => HEADER_REVIEW_STATUSES.has(task.status),
  },
];

const MissionHeader: React.FC<MissionHeaderProps> = ({ statusSummary, taskStats, tasks, snapshotTime, tokenUsage, onOpenTokens }) => {
  const [activePill, setActivePill] = useState<HeaderPillKey | null>(null);

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

  const formatTaskLabel = (task: TaskSnapshot) => {
    const label = task.taskNumber ? `Task #${task.taskNumber}` : task.title ?? task.id ?? "Task";
    return label;
  };

  const formatTaskInfo = (task: TaskSnapshot) => {
    if (task.title && task.taskNumber) {
      return task.title;
    }
    if (task.summary) {
      return task.summary;
    }
    return task.status.replace(/_/g, " ");
  };

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
        <div className="mission-header__meta">
          <button type="button" className="token-chip mission-header__tokens" title="Open ROI + token usage" onClick={onOpenTokens}>
            <span className="token-chip__value">{tokenUsage.toLocaleString()}</span>
            <span className="token-chip__label">Tokens</span>
          </button>
          <span className="mission-header__timestamp" aria-label="Last snapshot time">
            <strong>{snapshotTime}</strong>
          </span>
        </div>
        <div className="mission-header__tasks-row" role="group" aria-label="Mission snapshot">
          {pills.map((pill) => (
            <button
              key={pill.key}
              type="button"
              className={`mission-header__stat-pill mission-header__stat-pill--${pill.tone}`}
              title={`${pill.label}: ${pill.value}`}
              aria-label={`${pill.label}: ${pill.value}`}
              aria-expanded={activePill === pill.key}
              data-active={activePill === pill.key ? "true" : "false"}
              onClick={() => setActivePill((prev) => (prev === pill.key ? null : pill.key))}
            >
              <span className="mission-header__stat-icon" aria-hidden="true">
                {pill.icon}
              </span>
              <strong>{pill.value}</strong>
            </button>
          ))}
        </div>
        {activeDetail && (
          <div className="mission-header__pill-detail" role="region" aria-live="polite">
            <div className={`mission-header__pill-detail-card mission-header__pill-detail-card--${activeDetail.pill.tone}`}>
              <div className="mission-header__pill-detail-header">
                <div>
                  <p>{activeDetail.pill.label}</p>
                  <strong>{activeDetail.pill.description}</strong>
                </div>
                <button type="button" className="mission-header__pill-detail-close" onClick={() => setActivePill(null)} aria-label="Hide task details">
                  {"\u00D7"}
                </button>
              </div>
              <ul className="mission-header__pill-detail-list">
                {activeDetail.tasks.length === 0 && <li className="mission-header__pill-detail-empty">No tasks currently in this state.</li>}
                {activeDetail.tasks.slice(0, 5).map((task, index) => (
                  <li key={task.id ?? task.taskNumber ?? task.title ?? `task-${index}`} className="mission-header__pill-detail-item">
                    <span className="mission-header__pill-detail-task">{formatTaskLabel(task)}</span>
                    <span className="mission-header__pill-detail-meta">{formatTaskInfo(task)}</span>
                  </li>
                ))}
                {activeDetail.tasks.length > 5 && (
                  <li className="mission-header__pill-detail-more">+{activeDetail.tasks.length - 5} more</li>
                )}
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
          aria-label="Mission completion"
        >
          <div className="mission-progress__track">
            <span className="mission-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="mission-progress__value">{progress}%</span>
        </div>
      </div>
    </header>
  );
};

export default MissionHeader;
