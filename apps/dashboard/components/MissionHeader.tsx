import React, { useMemo } from "react";
import { StatusSummary } from "../utils/mission";

interface MissionHeaderProps {
  statusSummary: StatusSummary;
  snapshotTime: string;
  tokenUsage: number;
  onOpenTokens: () => void;
}

const MissionHeader: React.FC<MissionHeaderProps> = ({ statusSummary, snapshotTime, tokenUsage, onOpenTokens }) => {
  const progress = useMemo(() => {
    if (statusSummary.total === 0) {
      return 0;
    }
    return Math.round((statusSummary.completed / statusSummary.total) * 100);
  }, [statusSummary.completed, statusSummary.total]);

  const stats = [
    { label: "Active", value: statusSummary.active },
    { label: "Complete", value: statusSummary.completed },
    { label: "Blocked", value: statusSummary.blocked },
    { label: "Total", value: statusSummary.total },
  ];

  return (
    <header className="mission-header">
      <div className="mission-header__top">
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
        <button type="button" className="token-pill" title="Open ROI + token usage" onClick={onOpenTokens}>
          <span className="token-pill__pacman" aria-hidden="true">
            <span className="token-pill__dots" />
          </span>
          <div className="token-pill__copy">
            <strong>{tokenUsage.toLocaleString()}</strong>
            <span>tokens</span>
          </div>
        </button>
      </div>
      <div className="mission-header__stats" role="group" aria-label="Mission snapshot">
        <span className="mission-header__stats-label">Tasks</span>
        {stats.map((stat) => (
          <div key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
        <div className="mission-header__stats-snapshot">
          <span>Snapshot</span>
          <strong>{snapshotTime}</strong>
        </div>
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
    </header>
  );
};

export default MissionHeader;

