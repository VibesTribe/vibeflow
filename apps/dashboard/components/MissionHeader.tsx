import React, { useMemo } from "react";
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
  snapshotTime: string;
  tokenUsage: number;
  onOpenTokens: () => void;
}

const MISSION_PILLS: Array<{ key: "completeRatio" | keyof MissionTaskStats; label: string; icon: string; tone: "pill-complete" | "pill-active" | "pill-flagged" | "pill-locked" }> = [
  { key: "completeRatio", label: "Complete", icon: "✓", tone: "pill-complete" },
  { key: "active", label: "Active", icon: "●", tone: "pill-active" },
  { key: "flagged", label: "Flagged", icon: "⚑", tone: "pill-flagged" },
  { key: "locked", label: "Locked", icon: "🔒", tone: "pill-locked" },
];

const MissionHeader: React.FC<MissionHeaderProps> = ({ statusSummary, taskStats, snapshotTime, tokenUsage, onOpenTokens }) => {
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
          <button type="button" className="token-chip mission-header__tokens" title="Open ROI + token usage" onClick={onOpenTokens}>
            <span className="token-chip__value">{tokenUsage.toLocaleString()}</span>
            <span className="token-chip__label">Tokens</span>
          </button>
          {pills.map((pill) => (
            <span key={pill.label} className={`mission-header__stat-pill mission-header__stat-pill--${pill.tone}`} title={pill.label}>
              <span className="mission-header__stat-icon" aria-hidden="true">
                {pill.icon}
              </span>
              <strong>{pill.value}</strong>
            </span>
          ))}
          <span className="mission-header__timestamp" aria-label="Last snapshot time">
            <strong>{snapshotTime}</strong>
          </span>
        </div>
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


