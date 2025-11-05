import React from "react";
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
  return (
    <aside className="rail rail--right" aria-label="Agent hangar">
      <div className="rail__header">
        <button type="button" onClick={onViewAll} className="rail__button rail__button--primary">
          Models
        </button>
        <button type="button" onClick={onAdd} className="rail__button rail__button--ghost">
          Add
        </button>
        <span className="rail__title">Agents</span>
      </div>
      <div className="rail__scroll">
        {loading && agents.length === 0 && <p className="rail__empty">Syncing agents...</p>}
        {agents.map((agent) => {
          const tier = (agent.tier ?? "Q").toUpperCase();
          const tierClass = `agent-pill__tier agent-pill__tier--${tier.toLowerCase()}`;
          const statusLabel = agent.status ?? "idle";
          const statusKey = statusLabel.toLowerCase().replace(/\s+/g, "_");

          return (
            <button key={agent.id} type="button" className="agent-pill" onClick={() => onSelectAgent(agent)}>
              <span className={tierClass}>{tier}</span>
              <img
                src={agent.icon}
                alt={agent.name}
                className="agent-pill__avatar"
                onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
                loading="lazy"
                decoding="async"
              />
              <span className="agent-pill__name" title={agent.name}>
                {agent.name}
              </span>
              <span className={`agent-pill__status agent-pill__status--${statusKey}`}>
                {statusLabel}
              </span>
            </button>
          );
        })}
        {!loading && agents.length === 0 && <p className="rail__empty">No agents registered yet.</p>}
      </div>
    </aside>
  );
};

export default AgentHangarPanel;
