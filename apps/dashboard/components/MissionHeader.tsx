import React, { ReactNode, useMemo, useState } from "react";
import { TaskSnapshot } from "@core/types";
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
type MissionPillKey = "completeRatio" | keyof MissionTaskStats;

type TaskFilter = (tasks: TaskSnapshot[]) => TaskSnapshot[];

interface MissionPillConfig {
  key: MissionPillKey;
  label: string;
  description: string;
  icon: ReactNode;
  tone: MissionPillTone;
  taskFilter?: TaskFilter;
}

const COMPLETED_STATUSES = new Set<TaskSnapshot["status"]>(["complete", "ready_to_merge", "supervisor_approval"]);
const ACTIVE_STATUSES = new Set<TaskSnapshot["status"]>(["assigned", "in_progress", "received", "testing", "supervisor_review"]);
const FLAGGED_STATUSES = new Set<TaskSnapshot["status"]>(["supervisor_review", "supervisor_approval", "received"]);
const LOCKED_STATUSES = new Set<TaskSnapshot["status"]>(["blocked", "awaiting_dependency", "paused"]);

const MISSION_PILLS: MissionPillConfig[] = [
  {
    key: "completeRatio",
    label: "Complete",
    description: "Completed tasks vs mission total",
    icon: "\u2713",
    tone: "pill-complete",
    taskFilter: (tasks) => tasks.filter((task) => COMPLETED_STATUSES.has(task.status)),
  },
  {
    key: "active",
    label: "In Progress",
    description: "Currently active mission tasks",
    icon: "\u21BB",
    tone: "pill-active",
    taskFilter: (tasks) => tasks.filter((task) => ACTIVE_STATUSES.has(task.status)),
  },
  {
    key: "flagged",
    label: "Flagged",
    description: "Tasks needing review or attention",
    icon: "\u2691",
    tone: "pill-flagged",
    taskFilter: (tasks) => tasks.filter((task) => FLAGGED_STATUSES.has(task.status)),
  },
  {
    key: "locked",
    label: "Locked",
    description: "Tasks waiting on dependencies",
    icon: "\u{1F512}",
    tone: "pill-locked",
    taskFilter: (tasks) => tasks.filter((task) => LOCKED_STATUSES.has(task.status)),
  },
];

const MissionHeader: React.FC<MissionHeaderProps> = ({ statusSummary, taskStats, tasks, snapshotTime, tokenUsage, onOpenTokens }) => {
  const [activePill, setActivePill] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (statusSummary.total === 0) {
      return 0;
    }
    return Math.round((statusSummary.completed / statusSummary.total) * 100);
  }, [statusSummary.completed, statusSummary.total]);

  const pills = useMemo(() => {
    return MISSION_PILLS.map((pill) => {
      if (pill.key === "completeRatio") {
        return { ...pill, value: `${taskStats.completed}/${Math.max(taskStats.total, 1)}` };
      }
      return { ...pill, value: taskStats[pill.key] ?? 0 };
    });
  }, [taskStats]);

  const activeDetail = useMemo(() => {
    if (!activePill) return null;
    const pill = MISSION_PILLS.find((candidate) => candidate.label === activePill);
    if (!pill) return null;
    const detailedTasks = pill.taskFilter ? pill.taskFilter(tasks) : [];
    return {
      pill,
      tasks: detailedTasks,
    };
  }, [activePill, tasks]);

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
              key={pill.label}
              type="button"
              className={`mission-header__stat-pill mission-header__stat-pill--${pill.tone}`}
              title={`${pill.label}: ${pill.value}`}
              aria-label={`${pill.label}: ${pill.value}`}
              aria-expanded={activePill === pill.label}
              data-active={activePill === pill.label ? "true" : "false"}
              onClick={() => setActivePill((prev) => (prev === pill.label ? null : pill.label))}
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
                {activeDetail.tasks.slice(0, 5).map((task) => (
                  <li key={`${task.taskNumber ?? task.id ?? task.title ?? Math.random()}`} className="mission-header__pill-detail-item">
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
