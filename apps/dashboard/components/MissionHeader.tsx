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

  return (
    <header className="mission-header">
      <div className="mission-header__left">
        <div className="mission-header__identity">
          <span className="vibes-orb" aria-hidden="true">
            <span className="vibes-orb__inner">
              Vibes
              <span className="vibes-orb__note" aria-hidden="true" />
            </span>
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
        <div className="mission-header__progress">
          <div className="mission-progress__label">
            <span>Mission completion</span>
            <span>{progress}%</span>
          </div>
          <div className="mission-progress__bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
        <dl className="mission-header__meta" aria-label="Mission snapshot">
          <div>
            <dt>Snapshot</dt>
            <dd>{snapshotTime}</dd>
          </div>
          <div>
            <dt>Active</dt>
            <dd>{statusSummary.active}</dd>
          </div>
          <div>
            <dt>Complete</dt>
            <dd>{statusSummary.completed}</dd>
          </div>
          <div>
            <dt>Blocked</dt>
            <dd>{statusSummary.blocked}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{statusSummary.total}</dd>
          </div>
        </dl>
      </div>
      <button type="button" className="token-pill" title="Open ROI + token usage" onClick={onOpenTokens}>
        <span className="token-pill__icon" aria-hidden="true" />
        <div className="token-pill__copy">
          <strong>{tokenUsage.toLocaleString()}</strong>
          <small>mission tokens</small>
        </div>
      </button>
    </header>
  );
};

export default MissionHeader;
