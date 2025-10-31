import React from 'react';
import { AgentSnapshot } from '@core/types';

interface AgentHangarProps {
  agents: AgentSnapshot[];
  selectedAgentId?: string | null;
  onSelectAgent?: (agent: AgentSnapshot) => void;
}

const AgentHangar: React.FC<AgentHangarProps> = ({ agents, selectedAgentId, onSelectAgent }) => {
  if (agents.length === 0) {
    return (
      <section className="agent-hangar">
        <header>
          <h2>Agent Hangar</h2>
        </header>
        <p className="agent-hangar__empty">Agents will appear here as telemetry syncs.</p>
      </section>
    );
  }

  return (
    <section className="agent-hangar">
      <header>
        <h2>Agent Hangar</h2>
        <p>{agents.length} agents online</p>
      </header>
      <ul>
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          return (
            <li key={agent.id} className={isSelected ? 'agent-hangar__item agent-hangar__item--selected' : 'agent-hangar__item'}>
              <button type="button" onClick={() => onSelectAgent?.(agent)}>
                <span className="agent-hangar__name">{agent.name}</span>
                <span className={`agent-hangar__status agent-hangar__status--${agent.status}`}>{agent.status}</span>
                <span className="agent-hangar__summary">{agent.summary}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default AgentHangar;
