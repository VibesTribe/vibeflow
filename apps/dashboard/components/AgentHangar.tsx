import React from "react";
import { AgentSnapshot } from "@core/types";

interface AgentHangarProps {
  agents: AgentSnapshot[];
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: AgentSnapshot) => void;
  isLoading?: boolean;
}

const AgentHangar: React.FC<AgentHangarProps> = ({ agents, selectedAgentId, onSelectAgent, isLoading }) => {
  return (
    <section className="agent-hangar">
      <header>
        <h2>Agent Hangar</h2>
        <div className="agent-hangar__legend">
          {isLoading ? <span className="agent-hangar__badge">Syncing</span> : <span>{agents.length} online</span>}
        </div>
      </header>

      {isLoading && agents.length === 0 ? (
        <p className="agent-hangar__empty">Loading telemetry...</p>
      ) : agents.length === 0 ? (
        <p className="agent-hangar__empty">Agents will appear here once missions run.</p>
      ) : (
        <ul>
          {agents.map((agent) => {
            const isSelected = agent.id === selectedAgentId;
            const statusClass = `agent-hangar__status agent-hangar__status--${agent.status}`;
            return (
              <li key={agent.id} className={isSelected ? "agent-hangar__item agent-hangar__item--selected" : "agent-hangar__item"}>
                <button type="button" onClick={() => onSelectAgent?.(agent)}>
                  <span className="agent-hangar__name">{agent.name}</span>
                  <span className={statusClass}>{agent.status}</span>
                  <span className="agent-hangar__summary">{agent.summary}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AgentHangar;
