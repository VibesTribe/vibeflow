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
        <button type="button" onClick={onViewAll} className="rail__button rail__button--primary">
          Models
        </button>
        <button type="button" onClick={onAdd} className="rail__button rail__button--ghost">
          Add
        </button>
        <span className="rail__title">Agent Hangar</span>
      </div>
      <div className="rail__scroll">
        {loading && orderedAgents.length === 0 && <p className="rail__empty">Syncing agents...</p>}
        {orderedAgents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={`agent-pill agent-pill--${normalizeStatus(agent.status)}`}
            onClick={() => onSelectAgent(agent)}
          >
            <div className="agent-pill__avatar-wrap">
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
            <span className="agent-pill__name" title={agent.name}>
              {agent.name}
            </span>
            <span className="agent-pill__status">{formatStatus(agent.status)}</span>
            {agent.summary && <span className="agent-pill__summary">{agent.summary}</span>}
          </button>
        ))}
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

function formatStatus(status: string) {
  if (!status) return "Idle";
  return status
    .split(/[ _-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export default AgentHangarPanel;

