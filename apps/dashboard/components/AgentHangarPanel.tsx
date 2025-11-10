import React, { useMemo } from "react";
import { MissionAgent } from "../utils/mission";
import { FALLBACK_ICON } from "../utils/icons";

interface AgentHangarPanelProps {
  agents: MissionAgent[];
  loading: boolean;
  onViewAll: () => void;
  onAdd: () => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

const AgentHangarPanel: React.FC<AgentHangarPanelProps> = ({ agents, loading, onViewAll, onAdd, onSelectAgent }) => {
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
      <div className="rail__scroll">
        {loading && orderedAgents.length === 0 && <p className="rail__empty">Syncing agents...</p>}
        {orderedAgents.map((agent) => {
          const tone = normalizeStatus(agent.status);
          const indicator = STATUS_INDICATORS[tone] ?? STATUS_INDICATORS.ready;
          return (
            <button key={agent.id} type="button" className={`agent-pill agent-pill--${tone}`} onClick={() => onSelectAgent(agent)}>
              <div className="agent-pill__logo">
                <img
                  src={agent.icon || FALLBACK_ICON}
                  alt={agent.name}
                  className="agent-pill__avatar"
                  loading="lazy"
                  decoding="async"
                  onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
                />
                <span className={`agent-pill__tier agent-pill__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
              </div>
              <div className="agent-pill__meta">
                <div className="agent-pill__title-row">
                  <span className="agent-pill__name" title={agent.name}>
                    {agent.name}
                  </span>
                  <span className={`agent-pill__indicator agent-pill__indicator--${tone}`} aria-label={indicator.label}>
                    {indicator.icon}
                  </span>
                </div>
                <span className="agent-pill__status">{indicator.label}</span>
                {agent.summary && <span className="agent-pill__summary">{agent.summary}</span>}
              </div>
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
  if (lower.includes("cooldown")) return "cooldown";
  if (lower.includes("issue") || lower.includes("blocked")) return "issue";
  if (lower.includes("working") || lower.includes("progress") || lower.includes("running")) return "ready";
  return "ready";
}

const STATUS_INDICATORS: Record<string, { label: string; icon: string }> = {
  ready: { label: "Ready", icon: "✓" },
  cooldown: { label: "Cooldown", icon: "⏳" },
  credit: { label: "Credit", icon: "💰" },
  issue: { label: "Issue", icon: "⚠" },
};

export default AgentHangarPanel;
