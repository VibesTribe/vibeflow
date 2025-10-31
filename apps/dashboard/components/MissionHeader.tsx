import React from "react";
import { StatusSummary } from "../utils/mission";

interface MissionHeaderProps {
  statusSummary: StatusSummary;
  snapshotTime: string;
  tokenUsage: number;
}

const MissionHeader: React.FC<MissionHeaderProps> = ({ statusSummary, snapshotTime, tokenUsage }) => {
  const { active, completed, blocked, total } = statusSummary;

  return (
    <header className="mission-header">
      <div className="mission-header__left">
        <span className="vibes-orb" aria-hidden="true">
          <span className="vibes-orb__inner">
            Vibes
            <span className="vibes-orb__note" aria-hidden="true" />
          </span>
        </span>
        <div className="mission-header__text">
          <p className="mission-header__eyebrow">
            <span>Mission Control</span>
            <span className="mission-header__separator" aria-hidden="true">
              {"\u00B7"}
            </span>
            <span className="mission-header__brand">Vibeflow</span>
          </p>
          <p className="mission-header__subtitle">Live orchestrations, telemetry, and ROI tracking at a glance.</p>
          <dl className="mission-header__meta" aria-label="Mission snapshot">
            <div>
              <dt>Snapshot</dt>
              <dd>{snapshotTime}</dd>
            </div>
            <div>
              <dt>Active</dt>
              <dd>{active}</dd>
            </div>
            <div>
              <dt>Complete</dt>
              <dd>{completed}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{blocked}</dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{total}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="mission-header__right">
        <div className="token-pill" title="Total mission tokens consumed">
          <span className="token-pill__icon" aria-hidden="true" />
          <div className="token-pill__copy">
            <strong>{tokenUsage.toLocaleString()}</strong>
            <small>mission tokens</small>
          </div>
        </div>
      </div>
    </header>
  );
};

export default MissionHeader;
