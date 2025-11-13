import React, { useMemo } from "react";
import { MissionAgent } from "../utils/mission";
import { FALLBACK_ICON } from "../utils/icons";

interface AgentHangarPanelProps {
  agents: MissionAgent[];
  loading: boolean;
  onViewAll: () => void;
  onAdd: () => void;
  onSelectAgent: (agent: MissionAgent) => void;
  onShowReviewQueue?: () => void;
  reviewPendingCount?: number;
}

const STATUS_META: Record<
  string,
  {
    label: string;
    icon: string;
  }
> = {
  ready: { label: "Ready", icon: "\u2713" },
  active: { label: "Active", icon: "\u21BB" },
  cooldown: { label: "Cooldown", icon: "\u23F3" },
  credit: { label: "Credit Needed", icon: "\u{1F4B0}" },
  issue: { label: "Issue", icon: "\u26A0" },
};

const AgentHangarPanel: React.FC<AgentHangarPanelProps> = ({
  agents,
  loading,
  onViewAll,
  onAdd,
  onSelectAgent,
  onShowReviewQueue,
  reviewPendingCount = 0,
}) => {
  const orderedAgents = useMemo(() => agents.slice().sort((a, b) => a.name.localeCompare(b.name)), [agents]);

  return (
    <aside className="rail rail--right" aria-label="Agent hangar">
      <div className="rail__header">
        <button type="button" onClick={onViewAll} className="rail__button rail__button--ghost">
          Models
        </button>
        <button type="button" onClick={onAdd} className="rail__button rail__button--ghost">
          Add
        </button>
        <span className="rail__title">Agent Hangar</span>
      </div>
      {onShowReviewQueue && (
        <div className="rail__tabs" role="tablist" aria-label="Sidebar tabs">
          <button type="button" className="rail__tab rail__tab--active" role="tab" aria-selected="true">
            Agents
          </button>
          <button type="button" className="rail__tab" role="tab" aria-selected="false" onClick={onShowReviewQueue}>
            🧾 Review Queue
            {reviewPendingCount > 0 && <span className="rail__tab-badge">{reviewPendingCount}</span>}
          </button>
        </div>
      )}
      <div className="rail__scroll">
        {loading && orderedAgents.length === 0 && <p className="rail__empty">Syncing agents...</p>}
        {orderedAgents.map((agent) => {
          const tone = normalizeStatus(agent.status);
          const indicator = STATUS_META[tone] ?? STATUS_META.ready;
          return (
            <button
              key={agent.id}
              type="button"
              className={`agent-chip agent-chip--${tone}`}
              aria-label={`${agent.name} · ${indicator.label}`}
              onClick={() => onSelectAgent(agent)}
            >
              <div className="agent-chip__logo">
                <img
                  src={agent.icon || FALLBACK_ICON}
                  alt={agent.name}
                  className="agent-chip__avatar"
                  loading="lazy"
                  decoding="async"
                  onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
                />
                <span className={`agent-chip__status agent-chip__status--${tone}`} aria-hidden="true">
                  {indicator.icon}
                </span>
                <span className={`agent-chip__tier agent-chip__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
              </div>
              <span className="agent-chip__name" title={agent.name}>
                {agent.name}
              </span>
            </button>
          );
        })}
        {!loading && orderedAgents.length === 0 && <p className="rail__empty">No agents registered yet.</p>}
      </div>
    </aside>
  );
};

function normalizeStatus(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes("credit")) return "credit";
  if (lower.includes("cooldown") || lower.includes("timeout")) return "cooldown";
  if (lower.includes("issue") || lower.includes("blocked") || lower.includes("error")) return "issue";
  if (lower.includes("working") || lower.includes("progress") || lower.includes("running")) return "active";
  return "ready";
}

export default AgentHangarPanel;
