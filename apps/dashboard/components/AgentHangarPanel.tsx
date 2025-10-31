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
    <aside className="mission-panel mission-panel--right">
      <div className="mission-panel__sticky">
        <div className="mission-panel__actions">
          <button type="button" onClick={onViewAll} className="mission-button mission-button--primary">
            View All
          </button>
          <button type="button" onClick={onAdd} className="mission-button mission-button--ghost">
            Add
          </button>
        </div>
        <h2 className="mission-panel__title">Agent Hangar</h2>
      </div>
      <div className="mission-panel__scroll">
        {loading && agents.length === 0 && <p className="mission-empty">Syncing agents…</p>}
        {agents.map((agent) => (
          <button key={agent.id} type="button" onClick={() => onSelectAgent(agent)} className="agent-card">
            <span className={`agent-card__tier agent-card__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
            <img src={agent.icon} alt="" className="agent-card__icon" onError={(event) => (event.currentTarget.src = FALLBACK_ICON)} />
            <div className="agent-card__body">
              <strong>{agent.name}</strong>
              <span className={`agent-card__status agent-card__status--${agent.status ?? "idle"}`}>{agent.status ?? "idle"}</span>
            </div>
          </button>
        ))}
        {!loading && agents.length === 0 && <p className="mission-empty">No agents registered yet.</p>}
      </div>
    </aside>
  );
};

export default AgentHangarPanel;

