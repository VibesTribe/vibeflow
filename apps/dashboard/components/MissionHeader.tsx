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
      <div className="mission-header__row">
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
            <p className="mission-header__timestamp">Snapshot {snapshotTime}</p>
          </div>
        </div>
        <dl className="mission-header__stats" aria-label="Mission snapshot">
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
      <div className="mission-header__token">
        <button type="button" className="token-pill" title="Open ROI + token usage" onClick={onOpenTokens}>
          <span className="token-pill__icon" aria-hidden="true" />
          <div className="token-pill__copy">
            <strong>{tokenUsage.toLocaleString()}</strong>
            <small>mission tokens</small>
          </div>
        </button>
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

