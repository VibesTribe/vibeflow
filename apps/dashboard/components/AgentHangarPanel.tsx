import React, { useMemo } from "react";
import { AgentSummaryRecord, MissionAgent } from "../utils/mission";
import { FALLBACK_ICON } from "../utils/icons";

interface AgentHangarPanelProps {
  agents: MissionAgent[];
  summaries: AgentSummaryRecord[];
  loading: boolean;
  onViewAll: () => void;
  onAdd: () => void;
  onSelectAgent: (agent: MissionAgent) => void;
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
  cooldown: { label: "Cooldown", icon: "\u23F2" },
  credit: { label: "Credit Needed", icon: "\u{1F4B0}" },
  issue: { label: "Issue", icon: "\u26A0" },
};

const AgentHangarPanel: React.FC<AgentHangarPanelProps> = ({ agents, summaries, loading, onViewAll, onAdd, onSelectAgent }) => {
  const cards = useMemo(() => {
    if (summaries.length > 0) {
      return summaries.slice().sort((a, b) => a.agent.name.localeCompare(b.agent.name));
    }
    return agents.map((agent) => ({
      agent,
      assigned: 0,
      succeeded: 0,
      failed: 0,
      successRate: 100,
      tokensUsed: 0,
      tokensToday: 0,
      avgRuntime: 0,
      primaryTask: null,
      statusKey: normalizeStatus(agent.status),
      statusLabel: agent.status,
      recentTasks: [],
      cooldownRemainingLabel: null,
      effectiveContextTokens: agent.effectiveContextWindowTokens ?? agent.contextWindowTokens,
    }));
  }, [agents, summaries]);

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
        {loading && cards.length === 0 && <p className="rail__empty">Syncing agents...</p>}
        {cards.map((summary) => {
          const tone = normalizeStatus(summary.agent.status);
          const indicator = STATUS_META[tone] ?? STATUS_META.ready;
          return (
            <article key={summary.agent.id} className={`agent-card agent-card--${tone}`}>
              <header className="agent-card__header">
                <span className={`agent-pill__tier agent-pill__tier--${summary.agent.tier.toLowerCase()}`}>{summary.agent.tier}</span>
                <div className="agent-card__title">
                  <strong>{summary.agent.name}</strong>
                  <span className={`status-dot status-dot--${summary.statusKey}`}>
                    <span className="status-dot__icon">{indicator.icon}</span>
                    {summary.statusLabel}
                  </span>
                </div>
                <button type="button" className="agent-card__detail" onClick={() => onSelectAgent(summary.agent)}>
                  Open
                </button>
              </header>
              <div className="agent-card__stats">
                <span className="model-panel__stat model-panel__stat--assigned">
                  Assigned <strong>{summary.assigned}</strong>
                </span>
                <span className="model-panel__stat model-panel__stat--success">
                  Succeeded <strong>{summary.succeeded}</strong>
                </span>
                <span className="model-panel__stat model-panel__stat--failed">
                  Failed <strong>{summary.failed}</strong>
                </span>
                <span className={`model-panel__success model-panel__success--${summary.statusKey}`}>Success {summary.successRate}%</span>
              </div>
              <div className="agent-card__meta">
                <span>Tokens: {summary.tokensUsed.toLocaleString()}</span>
                <span>Today: {formatTokenCount(summary.tokensToday)}</span>
                <span>Rate limit: {summary.agent.rateLimitWindowSeconds ? `${summary.agent.rateLimitWindowSeconds}s` : "n/a"}</span>
                <span>Cost / 1k: {summary.agent.costPer1kTokensUsd ? `$${summary.agent.costPer1kTokensUsd.toFixed(2)}` : "Unknown"}</span>
              </div>
              <div className="agent-card__footer">
                <div className="agent-card__avatar">
                  <img
                    src={summary.agent.icon || FALLBACK_ICON}
                    alt={summary.agent.name}
                    loading="lazy"
                    decoding="async"
                    onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
                  />
                </div>
                <p>{summary.primaryTask ? `Working on ${summary.primaryTask.taskNumber ?? summary.primaryTask.title}` : "Idle"}</p>
              </div>
            </article>
          );
        })}
        {!loading && cards.length === 0 && <p className="rail__empty">No agents registered yet.</p>}
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

function formatTokenCount(tokens: number) {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (tokens >= 10_000) {
    return `${Math.round(tokens / 1_000)}K`;
  }
  return tokens.toLocaleString();
}

export default AgentHangarPanel;
