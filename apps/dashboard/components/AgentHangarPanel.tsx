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
          const indicator = STATUS_META[tone] ?? STATUS_META.ready;
          return (
            <button
              key={agent.id}
              type="button"
              className={`agent-pill agent-pill--${tone}`}
              aria-label={`${agent.name} · ${indicator.label}`}
              onClick={() => onSelectAgent(agent)}
            >
              <div className="agent-pill__circle">
                <img
                  src={agent.icon || FALLBACK_ICON}
                  alt=""
                  className="agent-pill__avatar"
                  loading="lazy"
                  decoding="async"
                  onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
                />
                <span className={`agent-pill__status-dot agent-pill__status-dot--${tone}`} aria-hidden="true">
                  {indicator.icon}
                </span>
                <span className={`agent-pill__tier agent-pill__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
              </div>
              <span className="agent-pill__name" title={agent.name}>
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

const STATUS_META: Record<string, { label: string; icon: string }> = {
  ready: { label: "Ready", icon: "✓" },
  active: { label: "Active", icon: "↻" },
  cooldown: { label: "Cooldown", icon: "⏳" },
  credit: { label: "Credit Needed", icon: "💰" },
  issue: { label: "Issue", icon: "⚠" },
};

export default AgentHangarPanel;
