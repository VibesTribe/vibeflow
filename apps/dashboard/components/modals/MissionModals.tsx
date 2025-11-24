import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MissionEvent } from "../../../../src/utils/events";
import {
  AgentAssignmentRecord,
  AgentCreditStatus,
  AgentLiveAssignment,
  AgentPerformanceStats,
  AgentRecentTask,
  AgentRoutingDecision,
  AgentTokenStats,
  MissionAgent,
  MissionSlice,
  SliceAssignment,
  buildAgentSummaries,
  buildRecentTasks,
  calculateCooldownRemaining,
  collectAgentAssignments,
  formatStatusLabel,
  normalizeAgentStatus,
} from "../../utils/mission";
import { TaskSnapshot, TaskStatus } from "@core/types";
import AdminControlCenter from "./AdminControlCenter";

export type MissionModalState =
  | { type: null }
  | { type: "docs" }
  | { type: "logs" }
  | { type: "models" }
  | { type: "roi" }
  | { type: "agent"; agent: MissionAgent }
  | { type: "slice"; slice: MissionSlice }
  | { type: "assignment"; assignment: SliceAssignment; slice: MissionSlice }
  | { type: "add" }
  | { type: "admin" };

interface MissionModalsProps {
  modal: MissionModalState;
  onClose: () => void;
  events: MissionEvent[];
  agents: MissionAgent[];
  slices: MissionSlice[];
  onOpenReview?: (taskId: string) => void;
  onSelectAgent?: (agent: MissionAgent) => void;
  onShowModels?: () => void;
}

const DOC_LINKS = [
  { label: "Product Requirements (PRD)", path: "/docs/overview.html" },
  { label: "System Plan", path: "/docs/system_plan_v5.html" },
  { label: "Runbook", path: "/docs/runbook.html" },
];

const ACTIVE_STATUSES = new Set<TaskStatus>(["assigned", "in_progress", "received", "testing"]);

type SliceFilterKey = "complete" | "active" | "pending" | "review";

const COMPLETED_STATUSES = new Set<TaskStatus>(["complete", "ready_to_merge", "supervisor_approval"]);
const REVIEW_STATUSES = new Set<TaskStatus>(["supervisor_review"]);
const PENDING_STATUSES = new Set<TaskStatus>(["assigned", "blocked"]);

const SLICE_FILTER_META: Record<
  SliceFilterKey,
  {
    label: string;
    icon: string;
    tone: string;
    color: string;
    match: (status: TaskStatus) => boolean;
  }
> = {
  complete: {
    label: "Complete",
    icon: "\u2713",
    tone: "complete",
    color: "#22c55e",
    match: (status) => COMPLETED_STATUSES.has(status),
  },
  active: {
    label: "Active",
    icon: "\u21BB",
    tone: "active",
    color: "#38bdf8",
    match: (status) => ACTIVE_STATUSES.has(status),
  },
  pending: {
    label: "Pending",
    icon: "\u23F3",
    tone: "pending",
    color: "#facc15",
    match: (status) => PENDING_STATUSES.has(status),
  },
  review: {
    label: "Review",
    icon: "\u{1F6A9}",
    tone: "review",
    color: "#ff3b6f",
    match: (status) => REVIEW_STATUSES.has(status),
  },
};

const ROUTING_EVENT_TYPES = new Set(["route", "routing_decision", "retry", "reroute", "validation"]);

const MissionModals: React.FC<MissionModalsProps> = ({ modal, onClose, events, agents, slices, onOpenReview, onSelectAgent, onShowModels }) => {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    modalRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [modal]);
  if (modal.type === null) {
    return null;
  }

  let content: React.ReactNode = null;
  switch (modal.type) {
    case "docs":
      content = <DocumentList />;
      break;
    case "logs":
      content = <LogList events={events} />;
      break;
    case "roi":
      content = <RoiPanel agents={agents} slices={slices} />;
      break;
    case "models":
      content = <ModelOverview agents={agents} slices={slices} onSelectAgent={onSelectAgent} />;
      break;
    case "agent":
      content = <AgentDetails agent={modal.agent} events={events} slices={slices} onBackToModels={onShowModels} />;
      break;
    case "slice":
      content = <SliceDetails slice={modal.slice} events={events} onOpenReview={onOpenReview} />;
      break;
    case "assignment":
      content = <AssignmentDetails assignment={modal.assignment} slice={modal.slice} events={events} onOpenReview={onOpenReview} />;
      break;
    case "add":
      content = <AddAgentForm onClose={onClose} />;
      break;
    case "admin":
      content = <AdminControlCenter />;
      break;
    default:
      content = null;
  }

  const canShowBackControl = modal.type === "agent" && typeof onShowModels === "function";

  const modalClasses = ["mission-modal"];
  if (modal.type === "models") {
    modalClasses.push("mission-modal--models");
  }
  if (modal.type === "admin") {
    modalClasses.push("mission-modal--admin");
  }

  return (
    <div className="mission-modal__overlay" role="dialog" aria-modal="true">
      <div className={modalClasses.join(" ")} ref={modalRef}>
        <div className="mission-modal__controls">
          {canShowBackControl && (
            <button type="button" className="mission-modal__back" onClick={onShowModels}>
              {"\u2190"} Back
            </button>
          )}
          <button type="button" className="mission-modal__close" onClick={onClose} aria-label="Close">
            {"\u00D7"}
          </button>
        </div>
        {content}
      </div>
    </div>
  );
};

export default MissionModals;

const DocumentList: React.FC = () => (
  <div className="mission-modal__section">
    <h3>Project Docs</h3>
    <ul className="mission-list">
      {DOC_LINKS.map((doc) => (
        <li key={doc.label}>
          <a href={doc.path} target="_blank" rel="noreferrer" className="mission-link">
            {doc.label}
          </a>
        </li>
      ))}
    </ul>
  </div>
);

const LogList: React.FC<{ events: MissionEvent[] }> = ({ events }) => (
  <div className="mission-modal__section mission-modal__section--sticky">
    <h3>Recent Logs</h3>
    <ul className="mission-log-list">
      {events.slice(0, 40).map((event) => {
        const detailMessage = extractEventMessage(event);
        const eventLabel = formatEventLabel(event.type);
        const category = deriveLogCategory(event);
        return (
          <li key={event.id}>
            <span className={`mission-log__bullet mission-log__bullet--${category}`} />
            <div className="mission-log__entry">
              <div className="mission-log__header">
                <strong>{eventLabel}</strong>
                <span>{new Date(event.timestamp).toLocaleString()}</span>
                <span className="mission-log__category">{formatLogCategory(category)}</span>
              </div>
              {detailMessage && <p>{detailMessage}</p>}
            </div>
          </li>
        );
      })}
      {events.length === 0 && <li>No events yet.</li>}
    </ul>
  </div>
);

const MODEL_STATUS_LEGEND = [
  { key: "ready", label: "Ready", icon: "\u2713" },
  { key: "active", label: "Active", icon: "\u21BB" },
  { key: "cooldown", label: "Cooldown", icon: "\u23F3" },
  { key: "credit", label: "Credit Needed", icon: "\u{1F4B0}" },
  { key: "issue", label: "Issue", icon: "\u26A0" },
] as const;

const MODEL_TIER_LEGEND = [
  { key: "web", label: "Web", icon: "W" },
  { key: "mcp", label: "MCP", icon: "M" },
  { key: "internal", label: "Internal", icon: "Q" },
] as const;
const MODEL_STATUS_META = MODEL_STATUS_LEGEND.reduce<
  Record<ModelStatusKey, { label: string; icon: string }>
>(
  (acc, item) => {
    acc[item.key] = { label: item.label, icon: item.icon };
    return acc;
  },
  {} as Record<ModelStatusKey, { label: string; icon: string }>
);

type ModelStatusKey = (typeof MODEL_STATUS_LEGEND)[number]["key"];
type ModelTierKey = (typeof MODEL_TIER_LEGEND)[number]["key"];

const ModelOverview: React.FC<{ agents: MissionAgent[]; slices: MissionSlice[]; onSelectAgent?: (agent: MissionAgent) => void }> = ({
  agents,
  slices,
  onSelectAgent,
}) => {
  const [statusFilter, setStatusFilter] = useState<ModelStatusKey | null>(null);
  const [tierFilter, setTierFilter] = useState<ModelTierKey | null>(null);
  const clearFilters = useCallback(() => {
    setStatusFilter(null);
    setTierFilter(null);
  }, []);
  const agentSummaries = useMemo(() => buildAgentSummaries(agents, slices), [agents, slices]);
  const toggleStatusFilter = useCallback(
    (nextKey: ModelStatusKey) => setStatusFilter((prev) => (prev === nextKey ? null : nextKey)),
    []
  );
  const toggleTierFilter = useCallback(
    (nextTier: ModelTierKey) => setTierFilter((prev) => (prev === nextTier ? null : nextTier)),
    []
  );
  const hasFilters = statusFilter !== null || tierFilter !== null;
  const filteredSummaries = useMemo(() => {
    return agentSummaries.filter((summary) => {
      if (statusFilter && summary.statusKey !== statusFilter) return false;
      if (tierFilter && summary.agent.tierCategory !== tierFilter) return false;
      return true;
    });
  }, [agentSummaries, statusFilter, tierFilter]);

  return (
    <div className="mission-modal__section mission-modal__section--sticky model-panel">
      <header className="model-panel__legend">
        <div className="model-panel__legend-row">
          {MODEL_STATUS_LEGEND.map((item) => {
            const isActive = statusFilter === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`status-dot status-dot--${item.key} ${isActive ? "is-active" : ""}`}
                onClick={() => toggleStatusFilter(item.key)}
                aria-pressed={isActive}
              >
                <span className="status-dot__icon">{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </div>
        <div className="model-panel__legend-row model-panel__legend-row--badges">
          {MODEL_TIER_LEGEND.map((tier) => {
            const isTierActive = tierFilter === tier.key;
            return (
              <button
                key={tier.key}
                type="button"
                className={`model-panel__legend-badge model-panel__legend-badge--${tier.key} ${
                  isTierActive ? "is-active" : ""
                }`}
                onClick={() => toggleTierFilter(tier.key)}
                aria-pressed={isTierActive}
              >
                <span className="model-panel__legend-badge-icon">{tier.icon}</span>
                <span>{tier.label}</span>
              </button>
            );
          })}
          <div className="model-panel__legend-actions">
            <button type="button" className="model-panel__action model-panel__action--primary" onClick={clearFilters}>
              View All
            </button>
            <button
              type="button"
              className="model-panel__action"
              onClick={clearFilters}
              disabled={!hasFilters}
              aria-disabled={!hasFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </header>
      <ul className="model-panel__list">
        {filteredSummaries.map((summary) => {
          const contextTokens = summary.effectiveContextTokens ? formatTokenCount(summary.effectiveContextTokens) : null;
          const cooldownLabel = summary.cooldownRemainingLabel ?? summary.agent.cooldownReason ?? "No cooldown";
          const statusMeta = MODEL_STATUS_META[summary.statusKey as ModelStatusKey] ?? MODEL_STATUS_META.ready;
          return (
              <li key={summary.agent.id} className={`model-panel__item model-panel__item--${summary.statusKey}`}>
              <div className="model-panel__header">
                <div className="model-panel__identity">
                  {summary.agent.icon && (
                    <img src={summary.agent.icon} alt={`${summary.agent.name} logo`} className="model-panel__logo" />
                  )}
                  <div>
                    <strong>{summary.agent.name}</strong>
                    {summary.agent.vendor && <span className="model-panel__vendor">{summary.agent.vendor}</span>}
                  </div>
                </div>
                {onSelectAgent && (
                  <button type="button" className="model-panel__detail" onClick={() => onSelectAgent(summary.agent)}>
                    Details
                  </button>
                )}
              </div>
              <div className="model-panel__status-line">
                <button
                  type="button"
                  className={`model-panel__tier-toggle ${tierFilter === summary.agent.tierCategory ? "is-active" : ""}`}
                  onClick={() => toggleTierFilter(summary.agent.tierCategory)}
                  aria-label={`Filter ${summary.agent.tierCategory} agents`}
                  aria-pressed={tierFilter === summary.agent.tierCategory}
                >
                  <span className={`agent-pill__tier agent-pill__tier--${summary.agent.tier.toLowerCase()}`}>{summary.agent.tier}</span>
                </button>
                <span className={`status-dot status-dot--${summary.statusKey}`}>
                  <span className="status-dot__icon">{statusMeta?.icon}</span>
                  {statusMeta?.label}
                </span>
                {summary.primaryTask && (
                  <span className="model-panel__working">Working on {summary.primaryTask.taskNumber ?? summary.primaryTask.title}</span>
                )}
              </div>
              <div className="model-panel__metrics">
                <div className="model-panel__stats-row">
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
                <p className="model-panel__context">
                  Effective Context: {contextTokens ? `${contextTokens} tokens` : "Unknown"}
                </p>
                <p className="model-panel__cooldown">
                  Cooldown: {cooldownLabel}
                </p>
                <p className="model-panel__foot">Tokens used: {summary.tokensUsed.toLocaleString()} • Avg response: {summary.avgRuntime}s</p>
                <div className="model-panel__meta">
                  {summary.agent.rateLimitWindowSeconds !== undefined && (
                    <span>Rate limit: {summary.agent.rateLimitWindowSeconds ? `${summary.agent.rateLimitWindowSeconds}s` : "n/a"}</span>
                  )}
                  {summary.tokensToday > 0 && <span>Tokens today: {formatTokenCount(summary.tokensToday)}</span>}
                  {summary.agent.costPer1kTokensUsd !== undefined && (
                    <span>Cost / 1k: {summary.agent.costPer1kTokensUsd ? `$${summary.agent.costPer1kTokensUsd.toFixed(2)}` : "n/a"}</span>
                  )}
                </div>
              </div>
              <div className="model-panel__recent-activity">
                <p>Recent Activity</p>
                <ul>
                  {summary.recentTasks.length > 0 ? (
                    summary.recentTasks.map((task) => (
                      <li key={task.id} className={`model-panel__recent-item model-panel__recent-item--${task.outcome}`}>
                        <span>{task.taskNumber ?? task.title}</span>
                        <span>{task.sliceName ?? "Slice"}</span>
                        <span>{task.runtimeSeconds ? `${task.runtimeSeconds}s` : "n/a"}</span>
                      </li>
                    ))
                  ) : (
                    <li className="model-panel__recent-item model-panel__recent-item--empty">No activity logged.</li>
                  )}
                </ul>
              </div>
              {summary.agent.cooldownReason && <p className="model-panel__hint">{summary.agent.cooldownReason}</p>}
            </li>
          );
        })}
        {agentSummaries.length === 0 && <li className="model-panel__empty">No agents registered.</li>}
      </ul>
    </div>
  );
};

const RoiPanel: React.FC<{ agents: MissionAgent[]; slices: MissionSlice[] }> = ({ agents, slices }) => {
  const totals = useMemo(() => {
    const totalTokens = slices.reduce((sum, slice) => sum + (slice.tokens ?? 0), 0);
    const activeSlices = slices.filter((slice) => slice.active > 0).length;
    const blockedSlices = slices.filter((slice) => slice.blocked > 0).length;
    const completedSlices = slices.filter((slice) => slice.total > 0 && slice.completed >= slice.total).length;
    const agentSpend = agents.reduce((sum, agent) => sum + (agent.costPerRunUsd ?? 0), 0);
    return { totalTokens, activeSlices, blockedSlices, completedSlices, agentSpend };
  }, [agents, slices]);

  return (
    <div className="mission-modal__section roi-panel">
      <header className="roi-panel__header">
        <div>
          <h3>Mission ROI Snapshot</h3>
          <p>Total tokens consumed by all slices and agents.</p>
        </div>
        <div className="roi-panel__total">{totals.totalTokens.toLocaleString()} tokens</div>
      </header>
      <dl className="roi-panel__grid">
        <div>
          <dt>Active slices</dt>
          <dd>{totals.activeSlices}</dd>
        </div>
        <div>
          <dt>Blocked slices</dt>
          <dd>{totals.blockedSlices}</dd>
        </div>
        <div>
          <dt>Completed slices</dt>
          <dd>{totals.completedSlices}</dd>
        </div>
        <div>
          <dt>Avg agent cost / run</dt>
          <dd>${totals.agentSpend.toFixed(2)}</dd>
        </div>
      </dl>
      <p className="roi-panel__note">
        Replace this mock with live telemetry by mapping mission metrics to your cost model. Tokens are drawn from the current
        slice catalog and agent metadata.
      </p>
      <a className="roi-panel__action" href="/docs/reports/roi-calculator.html" target="_blank" rel="noreferrer">
        Open ROI calculator
      </a>
    </div>
  );
};
const AgentDetails: React.FC<{ agent: MissionAgent; events: MissionEvent[]; slices: MissionSlice[]; onBackToModels?: () => void }> = ({
  agent,
  events,
  slices,
  onBackToModels,
}) => {
  const timeline = useMemo(() => buildAgentTimeline(agent, slices, events), [agent, slices, events]);
  const intel = useMemo(() => buildAgentIntel(agent, slices, events), [agent, slices, events]);
  const [showLog, setShowLog] = useState(false);
  const statusKey = normalizeAgentStatus(agent.status);
  const cooldownLabel = intel.cooldownRemaining ?? agent.cooldownReason ?? "No cooldown";
  const rateLimitSeconds = intel.performance.rateLimitWindowSeconds ?? agent.rateLimitWindowSeconds ?? null;
  const liveTaskId = intel.liveAssignment?.taskId ?? null;

  const perfMetrics = [
    { label: "Context", value: intel.performance.contextWindow ? `${formatTokenCount(intel.performance.contextWindow)} tokens` : "Unknown" },
    { label: "Effective", value: intel.performance.effectiveContextWindow ? `${formatTokenCount(intel.performance.effectiveContextWindow)} tokens` : "Unknown" },
    { label: "Avg Runtime", value: `${intel.performance.avgRuntime || 0}s` },
    { label: "P95", value: `${intel.performance.p95Runtime || 0}s` },
    { label: "Cost / Run", value: intel.performance.costPerRunUsd ? `$${intel.performance.costPerRunUsd.toFixed(2)}` : "Unknown" },
    { label: "Cost / 1K", value: intel.performance.costPer1kTokensUsd ? `$${intel.performance.costPer1kTokensUsd.toFixed(2)}` : "Unknown" },
    { label: "Tokens Today", value: intel.tokenStats.today.toLocaleString() },
    { label: "Lifetime Tokens", value: intel.tokenStats.lifetime.toLocaleString() },
    { label: "Avg / Task", value: intel.tokenStats.average.toLocaleString() },
    { label: "Peak / Task", value: intel.tokenStats.peak.toLocaleString() },
  ];

  const stateChips = [
    { label: formatStatusLabel(agent.status), tone: statusKey },
    { label: `Cooldown: ${cooldownLabel}` },
    { label: `Credit: ${formatStatusLabel(intel.creditStatus ?? "unknown")}` },
    { label: `Rate Limit: ${rateLimitSeconds ? `${rateLimitSeconds}s` : "n/a"}` },
  ];

  const warnings = intel.warnings.slice(0, 3);
  const recentTasks = intel.recentTasks.slice(0, 4);

  return (
    <div className="mission-modal__section agent-panel agent-panel--details">
      <header className="agent-panel__hero">
        <p className="agent-panel__eyebrow">Model snapshot</p>
        <div className="agent-panel__title-row">
          {agent.icon && <img src={agent.icon} alt={`${agent.name} logo`} className="agent-panel__logo" />}
          <h3 className="agent-panel__title">{agent.name}</h3>
          <span className={`agent-panel__tier-pill agent-pill__tier agent-pill__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
          <span className={`agent-status-badge agent-status-badge--${statusKey}`}>{formatStatusLabel(agent.status)}</span>
        </div>
        <p className="agent-panel__summary">{agent.summary ?? agent.capability ?? "No summary provided."}</p>
      </header>

      <div className="agent-panel__lines">
        <div className="agent-panel__line">
          <span className="agent-panel__label">State</span>
          <div className="agent-panel__chips">
            {stateChips.map((chip) => (
              <span key={chip.label} className={`agent-panel__chip ${chip.tone ? `agent-panel__chip--${chip.tone}` : ""}`}>
                {chip.label}
              </span>
            ))}
            {agent.vendor && <span className="agent-panel__chip agent-panel__chip--subtle">{agent.vendor}</span>}
            {agent.capability && <span className="agent-panel__chip agent-panel__chip--subtle">{agent.capability}</span>}
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="agent-panel__line agent-panel__line--alert">
            <span className="agent-panel__label">Warnings</span>
            <div className="agent-panel__alerts">
              {warnings.map((warning, index) => (
                <span key={`${warning}-${index}`} className="agent-panel__alert-chip">
                  {warning}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="agent-panel__line">
          <span className="agent-panel__label">Performance & Tokens</span>
          <dl className="agent-panel__metrics-grid">
            {perfMetrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{metric.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="agent-panel__line">
          <span className="agent-panel__label">Assignments</span>
          <div className="agent-panel__assignments">
            {intel.liveAssignment ? (
              <article className="agent-panel__assignment-card">
                <div className="agent-panel__assignment-main">
                  <div>
                    <strong>{intel.liveAssignment.title ?? intel.liveAssignment.taskId}</strong>
                    <small>{intel.liveAssignment.sliceName ?? "Unknown slice"}</small>
                  </div>
                  <span className="agent-panel__chip agent-panel__chip--status">{formatStatusLabel(intel.liveAssignment.status)}</span>
                </div>
                {intel.routingHistory.length > 0 && (
                  <ul className="agent-panel__routing-inline">
                    {intel.routingHistory.map((entry) => (
                      <li key={entry.id}>
                        <span className={`agent-routing__badge agent-routing__badge--${entry.direction}`}>{entry.direction}</span>
                        <div>
                          <strong>{entry.label}</strong>
                          {entry.reason && <small>{entry.reason}</small>}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ) : (
              <span className="agent-panel__muted agent-panel__muted--inline">No live assignments</span>
            )}
            {recentTasks.length > 0 ? (
              <ul className="agent-panel__recent-list">
                {recentTasks.map((task) => {
                  const isLive = liveTaskId === task.id;
                  return (
                    <li key={task.id} className={`agent-panel__task agent-panel__task--${task.outcome}`}>
                      <div>
                        <strong>{task.taskNumber ?? task.title}</strong>
                        <small>{task.sliceName ?? "Unknown slice"}</small>
                      </div>
                      <span>{task.runtimeSeconds ? `${task.runtimeSeconds}s` : "n/a"}</span>
                      <span className="agent-panel__task-status">{formatStatusLabel(task.status)}</span>
                      {isLive && <span className="agent-panel__task-live">Live</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <span className="agent-panel__muted">No tasks recorded for this agent</span>
            )}
          </div>
        </div>
      </div>

      <section className="agent-detail__section">
        <header className="agent-detail__section-header">
          <h4>Full Activity Log</h4>
          <button type="button" className="agent-detail__toggle" onClick={() => setShowLog((prev) => !prev)}>
            {showLog ? "Hide log" : "Show log"}
          </button>
        </header>
        {showLog && (
          <div className="agent-panel__timeline">
            {timeline.entries.map((entry) => (
              <article key={entry.id} className={`agent-panel__event agent-panel__event--${entry.kind}`}>
                <header>
                  <span>{entry.label}</span>
                  <time>{entry.timestamp}</time>
                </header>
                <p>{entry.message}</p>
              </article>
            ))}
            {timeline.entries.length === 0 && <p>No recent activity for this agent.</p>}
          </div>
        )}
      </section>
      {onBackToModels && (
        <div className="agent-panel__footer">
          <button type="button" className="agent-panel__back-link" onClick={onBackToModels}>
            {"\u2190"} Back to models
          </button>
        </div>
      )}
    </div>
  );
};

const STATUS_META: Partial<
  Record<
    TaskStatus,
    {
      label: string;
      tone: "complete" | "active" | "flagged" | "locked" | "default";
      icon: string;
      accent: string;
    }
  >
> = {
  assigned: { label: "Assigned", tone: "active", icon: "\u21BB", accent: "#60a5fa" },
  in_progress: { label: "In Progress", tone: "active", icon: "\u21BB", accent: "#67e8f9" },
  received: { label: "Received", tone: "active", icon: "\u21BB", accent: "#86efac" },
  testing: { label: "Testing", tone: "active", icon: "\u2699", accent: "#facc15" },
  supervisor_review: { label: "Needs Review", tone: "flagged", icon: "\u{1F6A9}", accent: "#ff3b6f" },
  supervisor_approval: { label: "Approved", tone: "complete", icon: "\u2713", accent: "#34d399" },
  ready_to_merge: { label: "Ready to Merge", tone: "complete", icon: "\u2713", accent: "#34d399" },
  complete: { label: "Completed", tone: "complete", icon: "\u2713", accent: "#34d399" },
  blocked: { label: "Blocked", tone: "locked", icon: "\u{1F512}", accent: "#f87171" },
};

const DEFAULT_STATUS_META = {
  label: "Queued",
  tone: "default",
  icon: "\u2022",
  accent: "#a5b4fc",
} as const;

function resolveStatusMeta(status?: TaskStatus | null) {
  return (status ? STATUS_META[status] : undefined) ?? DEFAULT_STATUS_META;
}

const SliceDetails: React.FC<{ slice: MissionSlice; events: MissionEvent[]; onOpenReview?: (taskId: string) => void }> = ({
  slice,
  events,
  onOpenReview,
}) => {
  const [selectedTask, setSelectedTask] = useState<TaskSnapshot | null>(null);
  const [filterKey, setFilterKey] = useState<SliceFilterKey | null>(null);
  const sliceListRef = useRef<HTMLUListElement | null>(null);
  const lastCollapsedTaskRef = useRef<string | null>(null);
  const pendingScrollTaskRef = useRef<string | null>(null);
  const pendingAccordionResetRef = useRef<string | null>(null);

  const assignmentsByTask = useMemo(() => {
    const map = new Map<string, SliceAssignment>();
    slice.assignments.forEach((assignment) => map.set(assignment.task.id, assignment));
    return map;
  }, [slice.assignments]);

  const statusCounts = useMemo<Record<SliceFilterKey, number>>(() => {
    const counts: Record<SliceFilterKey, number> = { complete: 0, active: 0, pending: 0, review: 0 };
    slice.assignments.forEach((assignment) => {
      const status = assignment.task.status;
      if (COMPLETED_STATUSES.has(status)) counts.complete += 1;
      if (ACTIVE_STATUSES.has(status)) counts.active += 1;
      if (PENDING_STATUSES.has(status)) counts.pending += 1;
      if (REVIEW_STATUSES.has(status)) counts.review += 1;
    });
    return counts;
  }, [slice.assignments]);

  const filterPredicate = filterKey ? SLICE_FILTER_META[filterKey].match : null;

  const orderedAssignments = useMemo(() => {
    if (!filterPredicate) {
      return slice.assignments;
    }
    return slice.assignments
      .slice()
      .sort((a, b) => Number(filterPredicate(b.task.status)) - Number(filterPredicate(a.task.status)));
  }, [slice.assignments, filterPredicate]);

  const handleJumpToTask = (taskId: string) => {
    const assignmentMatch = slice.assignments.find((assignment) => assignment.task.id === taskId);
    if (assignmentMatch) {
      pendingScrollTaskRef.current = assignmentMatch.task.id;
      setSelectedTask(assignmentMatch.task);
      return;
    }
    const fallback = slice.tasks.find((task) => task.id === taskId);
    if (fallback) {
      pendingScrollTaskRef.current = fallback.id;
      setSelectedTask(fallback);
    }
  };

  const scrollSliceTaskIntoView = useCallback(
    (taskId: string, behavior: ScrollBehavior = "smooth", block: ScrollLogicalPosition = "nearest") => {
      if (!sliceListRef.current) return;
      const target = sliceListRef.current.querySelector<HTMLElement>(`[data-slice-task="${taskId}"]`);
      target?.scrollIntoView({ behavior, block });
    },
    []
  );

  useEffect(() => {
    if (!selectedTask?.id) return;
    if (pendingScrollTaskRef.current === selectedTask.id) {
      scrollSliceTaskIntoView(selectedTask.id, "smooth", "start");
      pendingScrollTaskRef.current = null;
    }
    if (pendingAccordionResetRef.current === selectedTask.id) {
      requestAnimationFrame(() => {
        const accordion = sliceListRef.current?.querySelector<HTMLElement>(
          `[data-slice-task="${selectedTask.id}"] .slice-task-list__accordion`
        );
        accordion?.scrollTo({ top: 0 });
        pendingAccordionResetRef.current = null;
      });
    }
  }, [selectedTask, scrollSliceTaskIntoView]);

  useEffect(() => {
    if (selectedTask || !lastCollapsedTaskRef.current) return;
    const taskId = lastCollapsedTaskRef.current;
    lastCollapsedTaskRef.current = null;
    if (taskId) {
      requestAnimationFrame(() => scrollSliceTaskIntoView(taskId, "auto", "start"));
    }
  }, [selectedTask, scrollSliceTaskIntoView]);

  const handleCollapseTask = (taskId?: string) => {
    if (taskId) {
      lastCollapsedTaskRef.current = taskId;
    }
    setSelectedTask(null);
  };

  return (
    <div className="mission-modal__section mission-modal__section--sticky slice-panel">
      <header className="slice-panel__header">
        <div>
          <h3>{slice.name}</h3>
          <div className="slice-panel__summary">
            {(["complete", "active", "pending", "review"] as SliceFilterKey[]).map((key) => {
              const pillMeta = SLICE_FILTER_META[key];
              const value =
                key === "complete"
                  ? `${slice.completed}/${slice.total}`
                  : (statusCounts as Record<SliceFilterKey, number>)[key].toString();
              const isActive = filterKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`slice-panel__summary-pill slice-panel__summary-pill--${pillMeta.tone} ${
                    isActive ? "is-active" : ""
                  }`}
                  style={{ borderColor: `${pillMeta.color}66`, color: pillMeta.color }}
                  onClick={() => setFilterKey((prev) => (prev === key ? null : key))}
                  aria-pressed={isActive}
                >
                  <span aria-hidden="true">{pillMeta.icon}</span>
                  <span>
                    {pillMeta.label} {value}
                  </span>
                </button>
              );
            })}
            {slice.tokens !== undefined && (
              <span className="slice-panel__summary-token">{formatTokenCount(slice.tokens)} tokens</span>
            )}
          </div>
        </div>
        <button type="button" className="slice-panel__cta" onClick={() => handleCollapseTask()}>
          Collapse all
        </button>
      </header>
      <div className="slice-panel__content slice-panel__content--stacked">
        <ul className="slice-task-list" ref={sliceListRef}>
          {orderedAssignments.map((assignment) => {
            const isOpen = selectedTask?.id === assignment.task.id;
            const matchesFilter = Boolean(filterPredicate?.(assignment.task.status));
            const highlightStyle =
              matchesFilter && filterKey && !isOpen ? { borderColor: `${SLICE_FILTER_META[filterKey].color}66` } : undefined;
            const assignmentRecord = assignmentsByTask.get(assignment.task.id) ?? null;
            const statusMeta = resolveStatusMeta(assignment.task.status);
            const isReviewTask = REVIEW_STATUSES.has(assignment.task.status);
            const handleTaskClick = () => {
              setSelectedTask((prev) => {
                if (prev?.id === assignment.task.id) {
                  lastCollapsedTaskRef.current = assignment.task.id;
                  return null;
                }
                pendingScrollTaskRef.current = assignment.task.id;
                pendingAccordionResetRef.current = assignment.task.id;
                return assignment.task;
              });
              if (isReviewTask && onOpenReview) {
                onOpenReview(assignment.task.id);
              }
            };
            return (
              <li
                key={assignment.task.id}
                className={`${isOpen ? "is-open" : ""} ${matchesFilter ? "is-highlight" : ""}`.trim()}
                style={highlightStyle}
                data-slice-task={assignment.task.id}
              >
                <button
                  type="button"
                  className={isOpen ? "is-selected" : undefined}
                  onClick={handleTaskClick}
                  aria-expanded={isOpen}
                >
                  <span
                    className={`slice-task-list__status slice-task-list__status--${statusMeta.tone}`}
                    style={{ borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }}
                  >
                    {statusMeta.icon}
                  </span>
                  <div className="slice-task-list__copy">
                    <span className="slice-task-list__title">{assignment.task.taskNumber ?? assignment.task.title ?? "Task"}</span>
                    <div className="slice-task-list__meta-row">
                      <span
                        className={`slice-task-list__meta ${isReviewTask ? "slice-task-list__meta--review" : ""}`}
                        style={{ color: statusMeta.accent }}
                      >
                        {statusMeta.label ?? assignment.task.status.replace(/_/g, " ")}
                      </span>
                      {isReviewTask && onOpenReview && (
                        <>
                          <span className="slice-task-list__meta-divider" aria-hidden="true">
                            {"\u00B7"}
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            className="slice-task-list__review-link"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenReview(assignment.task.id);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                onOpenReview(assignment.task.id);
                              }
                            }}
                          >
                            Review Now
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="slice-task-list__summary">{assignment.task.summary ?? assignment.task.title}</span>
                </button>
                {isOpen && (
                  <div className="slice-task-list__accordion">
                    <TaskDetail
                      task={assignment.task}
                      assignment={assignmentRecord}
                      events={events.filter((event) => event.taskId === assignment.task.id)}
                      onJumpToTask={handleJumpToTask}
                      onCollapse={() => handleCollapseTask(assignment.task.id)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

type WarningMessage = {
  id: string;
  message: string;
  timestamp: string;
  category: MissionLogCategory;
};

const AssignmentDetails: React.FC<{
  assignment: SliceAssignment;
  slice: MissionSlice;
  events: MissionEvent[];
  onOpenReview?: (taskId: string) => void;
}> = ({ assignment, slice, events, onOpenReview }) => {
  const task = assignment.task;
  const agent = assignment.agent;
  const sortedEvents = useMemo(
    () =>
      events
        .filter((event) => event.taskId === task.id)
        .slice()
        .sort((a, b) => new Date(b.timestamp).valueOf() - new Date(a.timestamp).valueOf()),
    [events, task.id]
  );
  const activityLogs = useMemo(() => sortedEvents.slice(0, 32), [sortedEvents]);
  const wasRerouted = useMemo(() => sortedEvents.some((event) => ROUTING_EVENT_TYPES.has(event.type)), [sortedEvents]);
  const warningEvents = useMemo(
    () =>
      sortedEvents
        .filter((event) => {
          const category = deriveLogCategory(event);
          return category === "warning" || category === "error";
        })
        .slice(0, 2),
    [sortedEvents]
  );
  const warningMessages = useMemo<WarningMessage[]>(() => {
    const messages = warningEvents.map((event) => ({
      id: event.id,
      message: extractEventMessage(event) ?? event.reasonCode ?? formatEventLabel(event.type),
      timestamp: new Date(event.timestamp).toLocaleString(),
      category: deriveLogCategory(event),
    }));
    if (assignment.isBlocking) {
      messages.unshift({
        id: `${task.id}-blocking`,
        message: "Marked blocking — requires attention before proceeding.",
        timestamp: new Date(task.updatedAt).toLocaleString(),
        category: "warning",
      });
    }
    return messages;
  }, [warningEvents, assignment.isBlocking, task.id, task.updatedAt]);

  const statusMeta = resolveStatusMeta(task.status);
  const updatedAt = new Date(task.updatedAt).toLocaleString();
  const tokensUsed = task.metrics?.tokensUsed;
  const runtimeSeconds = task.metrics?.runtimeSeconds;
  const costPerTask = tokensUsed !== undefined && agent?.costPer1kTokensUsd ? (tokensUsed / 1000) * agent.costPer1kTokensUsd : null;
  const showReviewAction = Boolean(onOpenReview && (task.status === "supervisor_review" || task.status === "supervisor_approval"));

  return (
    <div className="mission-modal__section assignment-detail">
      <header className="assignment-detail__header">
        <div>
          <p className="assignment-detail__eyebrow">{slice.name}</p>
          <h3>{task.taskNumber ?? task.title}</h3>
          <p className="assignment-detail__summary">{task.summary ?? task.packet?.prompt ?? "No task summary provided yet."}</p>
        </div>
        <div className="assignment-detail__status">
          <span className="assignment-detail__status-pill" style={{ borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }}>
            <span aria-hidden="true">{statusMeta.icon}</span> {statusMeta.label}
          </span>
          {agent && (
            <div className="assignment-detail__agent">
              <span>{agent.name}</span>
              <small>{formatStatusLabel(agent.status)}</small>
            </div>
          )}
        </div>
      </header>

      <section className="assignment-detail__section assignment-detail__section--inline">
        <header>
          <h4>Current Progress</h4>
        </header>
        <div className="assignment-detail__row assignment-detail__row--status">
          <span className="assignment-detail__label">Status</span>
          <span style={{ color: statusMeta.accent }}>{formatStatusLabel(task.status)}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Updated</span>
          <span>{updatedAt}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Tokens used</span>
          <span>{tokensUsed !== undefined ? tokensUsed.toLocaleString() : "Unknown"}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Cost</span>
          <span>{costPerTask !== null ? `$${costPerTask.toFixed(2)}` : "Unknown"}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Cost / 1k tokens</span>
          <span>{agent?.costPer1kTokensUsd ? `$${agent.costPer1kTokensUsd.toFixed(2)}` : "Unknown"}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Runtime</span>
          <span>{runtimeSeconds !== undefined ? `${runtimeSeconds}s` : "n/a"}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Rate limit</span>
          <span>{agent?.rateLimitWindowSeconds ? `${agent.rateLimitWindowSeconds}s` : "n/a"}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Rerouted</span>
          <span>{wasRerouted ? "Yes" : "No"}</span>
        </div>
        <div className="assignment-detail__row">
          <span className="assignment-detail__label">Blocking</span>
          <span>{assignment.isBlocking ? "Yes" : "No"}</span>
        </div>
      </section>

      <section className="assignment-detail__section">
        <header>
          <h4>Activity</h4>
        </header>
        {warningMessages.length > 0 && (
          <div className="assignment-detail__activity-warnings">
            {warningMessages.map((entry) => (
              <article key={entry.id} className={`assignment-detail__activity-warning assignment-detail__activity-warning--${entry.category}`}>
                <div>
                  <strong>{entry.message}</strong>
                  <small>{entry.timestamp}</small>
                </div>
              </article>
            ))}
          </div>
        )}
        <ul className="mission-log-list assignment-detail__log">
          {activityLogs.length > 0 ? (
            activityLogs.map((event) => {
              const category = deriveLogCategory(event);
              const summary = extractEventMessage(event) ?? event.reasonCode ?? null;
              const participants = deriveEventParticipants(event);
              return (
                <li key={event.id}>
                  <span className={`mission-log__bullet mission-log__bullet--${category}`} />
                  <div className="mission-log__entry">
                    <div className="mission-log__headline">
                      <strong className={`mission-log__title mission-log__title--${category}`}>{formatEventLabel(event.type)}</strong>
                      {summary && <span className="mission-log__summary">. {summary}</span>}
                    </div>
                    {participants.length > 0 && (
                      <div className="mission-log__participants">
                        {participants.map((participant) => (
                          <span key={`${event.id}-${participant}`} className="mission-log__participant">
                            {participant}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mission-log__timestamp">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </li>
              );
            })
          ) : (
            <li>No activity recorded for this task yet.</li>
          )}
        </ul>
      </section>

      {showReviewAction && onOpenReview && (
        <div className="assignment-detail__actions">
          <button type="button" className="mission-button mission-button--primary" onClick={() => onOpenReview(task.id)}>
            Open Review
          </button>
        </div>
      )}
    </div>
  );
};

export const TaskDetail: React.FC<{
  task: TaskSnapshot;
  assignment: SliceAssignment | null;
  events: MissionEvent[];
  onJumpToTask: (taskId: string) => void;
  onCollapse?: () => void;
}> = ({
  task,
  assignment,
  events,
  onJumpToTask,
  onCollapse,
}) => {
  const [prompt, setPrompt] = useState(task.packet?.prompt ?? "");
  const statusMeta = resolveStatusMeta(task.status);

  return (
    <div className="task-detail">
      <header>
        <h4>{task.taskNumber ?? task.title}</h4>
        <span
          className="task-chip"
          style={{ borderColor: `${statusMeta.accent}66`, color: statusMeta.accent }}
        >
          {statusMeta.label}
        </span>
      </header>
      {assignment?.agent && (
        <p className="task-detail__agent">
          Assigned to <strong>{assignment.agent.name}</strong> ({assignment.agent.status})
        </p>
      )}
      <dl className="task-detail__meta">
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(task.confidence * 100)}%</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{new Date(task.updatedAt).toLocaleString()}</dd>
        </div>
        {task.metrics?.tokensUsed !== undefined && (
          <div>
            <dt>Tokens</dt>
            <dd>{task.metrics.tokensUsed.toLocaleString()}</dd>
          </div>
        )}
        {task.metrics?.runtimeSeconds !== undefined && (
          <div>
            <dt>Runtime</dt>
            <dd>{task.metrics.runtimeSeconds}s</dd>
          </div>
        )}
      </dl>
      {task.dependencies && task.dependencies.length > 0 && (
        <div className="task-detail__deps">
          <h5>Dependencies</h5>
          <ul>
            {task.dependencies.map((dep) => (
              <li key={dep}>
                <button type="button" onClick={() => onJumpToTask(dep)}>
                  {dep}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="task-detail__prompt">
        <h5>Prompt Packet</h5>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        {task.packet?.attachments && task.packet.attachments.length > 0 && (
          <ul>
            {task.packet.attachments.map((attachment) => (
              <li key={attachment.href}>
                <a href={attachment.href} target="_blank" rel="noreferrer">
                  {attachment.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="task-detail__events">
        <h5>Recent activity</h5>
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <span className={`mission-log__bullet mission-log__bullet--${inferLogTone(event)}`} />
              <div className="mission-log__entry">
                <div className="mission-log__header">
                  <strong>{formatEventLabel(event.type)}</strong>
                  <span>{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                {extractEventMessage(event) && <p>{extractEventMessage(event)}</p>}
              </div>
            </li>
          ))}
          {events.length === 0 && <li>No activity recorded for this task yet.</li>}
        </ul>
      </div>
      {onCollapse && (
        <div className="task-detail__actions">
          <button type="button" className="task-detail__collapse" onClick={onCollapse}>
            Collapse Detail
          </button>
        </div>
      )}
    </div>
  );
};

const AddAgentForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [value, setValue] = useState("");
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onClose();
  };
  return (
    <form className="mission-modal__section" onSubmit={handleSubmit}>
      <h3>Add Platform or Model</h3>
      <label className="mission-field">
        Platform / Model Name
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. OpenAI GPT-5" />
      </label>
      <p className="mission-modal__hint">Hook this into the registry by updating data/registry/platforms/index.json.</p>
      <div className="mission-modal__actions">
        <button type="button" onClick={onClose} className="mission-button mission-button--ghost">
          Cancel
        </button>
        <button type="submit" className="mission-button mission-button--primary" disabled={!value.trim()}>
          Save
        </button>
      </div>
    </form>
  );
};

function buildAgentTimeline(agent: MissionAgent, slices: MissionSlice[], events: MissionEvent[]) {
  const assignmentRecords = collectAgentAssignments(agent, slices);
  const assignments = assignmentRecords.map((record) => record.assignment);

  const taskIds = new Set(assignments.map((assignment) => assignment.task.id));
  const timelineEvents = events
    .filter((event) => (event.taskId ? taskIds.has(event.taskId) : false))
    .map((event) => ({
      id: event.id,
      kind: inferLogTone(event),
      label: event.type,
      timestamp: new Date(event.timestamp).toLocaleString(),
      message: extractEventMessage(event) ?? "",
    }));

  const successRate = assignments.length === 0 ? 100 : Math.round((assignments.filter((assignment) => isCompleted(assignment.task.status)).length / assignments.length) * 100);
  const tokensUsed = assignments.reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);

  return {
    entries: timelineEvents,
    activeAssignments: assignments.filter((assignment) => ACTIVE_STATUSES.has(assignment.task.status)),
    successRate,
    tokensUsed,
  };
}

function inferLogTone(event: MissionEvent): "success" | "warn" | "error" {
  if (event.reasonCode?.startsWith("E/")) {
    return "error";
  }
  if (event.type === "failure") {
    return "error";
  }
  if (event.type === "warning" || event.type === "note") {
    return "warn";
  }
  return "success";
}

function extractEventMessage(event: MissionEvent): string | null {
  if (!event.details) {
    return null;
  }
  if ("message" in event.details) {
    const value = (event.details as Record<string, unknown>).message;
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === "string" ? value : JSON.stringify(value);
  }
  return null;
}

type MissionLogCategory = "note" | "success" | "warning" | "route" | "validation" | "retry" | "error";

function formatEventLabel(value?: string) {
  if (!value) return "Update";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function deriveLogCategory(event: MissionEvent): MissionLogCategory {
  const type = event.type.toLowerCase();
  if (type.includes("route")) {
    return "route";
  }
  if (type.includes("validation") || type.includes("validator")) {
    return "validation";
  }
  if (type.includes("retry") || type.includes("reroute")) {
    return "retry";
  }
  if (event.reasonCode?.startsWith("E/") || type === "failure") {
    return "error";
  }
  if (type === "warning") {
    return "warning";
  }
  if (type === "note") {
    return "note";
  }
  return "success";
}

function deriveEventParticipants(event: MissionEvent): string[] {
  if (!event.details) {
    return [];
  }
  const details = event.details as Record<string, unknown>;
  const participants = new Set<string>();
  const from = readDetailString(details, ["fromRole", "fromProvider", "fromAgent", "previousAgent", "sourceAgent"]);
  const to = readDetailString(details, ["toRole", "toProvider", "toAgent", "nextAgent", "targetAgent"]);
  if (from || to) {
    const fromLabel = formatStatusLabel(from ?? "Previous agent");
    const toLabel = to ? formatStatusLabel(to) : null;
    participants.add(toLabel ? `${fromLabel} -> ${toLabel}` : fromLabel);
  }
  const actorKeys = ["agentRole", "role", "agent", "agentName", "agentId", "assignedAgent", "supervisor", "planner", "watcher", "tester", "orchestrator"];
  actorKeys.forEach((key) => {
    const value = readDetailString(details, [key]);
    if (value) {
      participants.add(formatStatusLabel(value));
    }
  });
  return Array.from(participants);
}

function readDetailString(details: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const raw = details[key];
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function formatLogCategory(category: MissionLogCategory) {
  switch (category) {
    case "route":
      return "Route";
    case "validation":
      return "Validation";
    case "retry":
      return "Retry";
    case "warning":
      return "Warning";
    case "note":
      return "Note";
    case "error":
      return "Error";
    default:
      return "Success";
  }
}

function isCompleted(status: TaskSnapshot["status"]) {
  return status === "ready_to_merge" || status === "complete" || status === "supervisor_approval";
}

function formatTokenCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (value >= 10_000) {
    return `${Math.round(value / 1_000)}K`;
  }
  return value.toLocaleString();
}

interface AgentIntelBundle {
  liveAssignment: AgentLiveAssignment | null;
  recentTasks: AgentRecentTask[];
  routingHistory: AgentRoutingDecision[];
  tokenStats: AgentTokenStats;
  performance: AgentPerformanceStats;
  warnings: string[];
  cooldownRemaining: string | null;
  creditStatus: AgentCreditStatus;
}

function buildAgentIntel(agent: MissionAgent, slices: MissionSlice[], events: MissionEvent[]): AgentIntelBundle {
  const assignmentRecords = collectAgentAssignments(agent, slices);
  const assignments = assignmentRecords.map((record) => record.assignment);
  const liveAssignmentRecord = assignmentRecords.find((record) => ACTIVE_STATUSES.has(record.assignment.task.status));
  return {
    liveAssignment: liveAssignmentRecord
      ? {
          taskId: liveAssignmentRecord.assignment.task.id,
          title: liveAssignmentRecord.assignment.task.taskNumber ?? liveAssignmentRecord.assignment.task.title,
          sliceName: liveAssignmentRecord.slice.name,
          status: liveAssignmentRecord.assignment.task.status,
          summary: liveAssignmentRecord.assignment.task.summary ?? liveAssignmentRecord.assignment.task.packet?.prompt,
        }
      : null,
    recentTasks: buildRecentTasks(assignmentRecords),
    routingHistory: buildRoutingHistory(agent, events),
    tokenStats: deriveTokenStats(assignments),
    performance: derivePerformanceStats(assignments, agent),
    warnings: deriveAgentWarnings(agent, assignmentRecords, events),
    cooldownRemaining: calculateCooldownRemaining(agent),
    creditStatus: agent.creditStatus ?? "unknown",
  };
}

function buildRoutingHistory(agent: MissionAgent, events: MissionEvent[]): AgentRoutingDecision[] {
  return events
    .filter((event) => ROUTING_EVENT_TYPES.has(event.type))
    .filter((event) => {
      const details = event.details ?? {};
      const toAgent = typeof details?.["toAgent"] === "string" ? (details["toAgent"] as string) : null;
      const fromAgent = typeof details?.["fromAgent"] === "string" ? (details["fromAgent"] as string) : null;
      const agentId = typeof details?.["agentId"] === "string" ? (details["agentId"] as string) : null;
      return toAgent === agent.id || fromAgent === agent.id || agentId === agent.id;
    })
    .slice(0, 3)
    .map((event) => {
      const details = event.details ?? {};
      const toAgent = typeof details?.["toAgent"] === "string" ? (details["toAgent"] as string) : null;
      const fromAgent = typeof details?.["fromAgent"] === "string" ? (details["fromAgent"] as string) : null;
      const direction: AgentRoutingDecision["direction"] =
        event.type === "validation" ? "validation" : event.type === "retry" || event.type === "reroute" ? "retry" : fromAgent === agent.id ? "from" : "to";
      const label =
        typeof details?.["label"] === "string"
          ? (details["label"] as string)
          : direction === "from"
            ? `Routed from ${details?.["fromProvider"] ?? fromAgent ?? "unknown"}`
            : direction === "validation"
              ? "Validator check"
              : `Routed to ${details?.["toProvider"] ?? toAgent ?? "unknown"}`;
      const reason = typeof details?.["reason"] === "string" ? (details["reason"] as string) : details?.["message"] ? String(details["message"]) : undefined;
      return {
        id: event.id,
        timestamp: event.timestamp,
        direction,
        label,
        reason,
      };
    });
}

function deriveTokenStats(assignments: SliceAssignment[]): AgentTokenStats {
  const todayCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const lifetime = assignments.reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
  const today = assignments
    .filter((assignment) => {
      const updated = assignment.task.updatedAt ? new Date(assignment.task.updatedAt).valueOf() : 0;
      return updated >= todayCutoff;
    })
    .reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
  const peak = assignments.reduce((max, assignment) => Math.max(max, assignment.task.metrics?.tokensUsed ?? 0), 0);
  const average = assignments.length === 0 ? 0 : Math.round(lifetime / assignments.length);
  return { today, lifetime, peak, average };
}

function derivePerformanceStats(assignments: SliceAssignment[], agent: MissionAgent): AgentPerformanceStats {
  const runtimes = assignments
    .map((assignment) => assignment.task.metrics?.runtimeSeconds)
    .filter((value): value is number => typeof value === "number");
  const avgRuntime = runtimes.length === 0 ? 0 : Math.round(runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length);
  const p95Runtime =
    runtimes.length === 0
      ? 0
      : (() => {
          const sorted = runtimes.slice().sort((a, b) => a - b);
          const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
          return sorted[index];
        })();
  return {
    avgRuntime,
    p95Runtime,
    contextWindow: agent.contextWindowTokens,
    effectiveContextWindow: agent.effectiveContextWindowTokens ?? agent.contextWindowTokens,
    costPerRunUsd: agent.costPerRunUsd,
    costPer1kTokensUsd: agent.costPer1kTokensUsd,
    rateLimitWindowSeconds: agent.rateLimitWindowSeconds ?? null,
  };
}

function deriveAgentWarnings(agent: MissionAgent, records: AgentAssignmentRecord[], events: MissionEvent[]): string[] {
  const warnings = new Set<string>();
  (agent.warnings ?? []).forEach((warning) => warnings.add(warning));
  if (agent.cooldownReason) {
    warnings.add(agent.cooldownReason);
  }
  const taskIds = new Set(records.map((record) => record.assignment.task.id));
  events
    .filter((event) => event.type === "warning" && taskIds.has(event.taskId))
    .forEach((event) => {
      const message = extractEventMessage(event) ?? event.reasonCode ?? "Warning reported";
      warnings.add(message);
    });
  return Array.from(warnings).slice(0, 4);
}











