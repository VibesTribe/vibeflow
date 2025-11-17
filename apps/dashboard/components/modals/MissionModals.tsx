import React, { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MissionEvent } from "../../../../src/utils/events";
import {
  AgentCreditStatus,
  AgentLiveAssignment,
  AgentPerformanceStats,
  AgentRecentTask,
  AgentRoutingDecision,
  AgentTokenStats,
  MissionAgent,
  MissionSlice,
  SliceAssignment,
} from "../../utils/mission";
import { TaskSnapshot, TaskStatus } from "@core/types";

export type MissionModalState =
  | { type: null }
  | { type: "docs" }
  | { type: "logs" }
  | { type: "models" }
  | { type: "roi" }
  | { type: "agent"; agent: MissionAgent }
  | { type: "slice"; slice: MissionSlice }
  | { type: "add" };

interface MissionModalsProps {
  modal: MissionModalState;
  onClose: () => void;
  events: MissionEvent[];
  agents: MissionAgent[];
  slices: MissionSlice[];
  onOpenReview?: (taskId: string) => void;
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

const MissionModals: React.FC<MissionModalsProps> = ({ modal, onClose, events, agents, slices, onOpenReview }) => {
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
      content = <ModelOverview agents={agents} slices={slices} />;
      break;
    case "agent":
      content = <AgentDetails agent={modal.agent} events={events} slices={slices} />;
      break;
    case "slice":
      content = <SliceDetails slice={modal.slice} events={events} onOpenReview={onOpenReview} />;
      break;
    case "add":
      content = <AddAgentForm onClose={onClose} />;
      break;
    default:
      content = null;
  }

  return (
    <div className="mission-modal__overlay" role="dialog" aria-modal="true">
      <div className={`mission-modal ${modal.type === "models" ? "mission-modal--models" : ""}`}>
        <button type="button" className="mission-modal__close" onClick={onClose} aria-label="Close">
          {"\u00D7"}
        </button>
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

const ModelOverview: React.FC<{ agents: MissionAgent[]; slices: MissionSlice[] }> = ({ agents, slices }) => {
  const [statusFilter, setStatusFilter] = useState<ModelStatusKey | null>(null);
  const [tierFilter, setTierFilter] = useState<ModelTierKey | null>(null);
  const agentSummaries = useMemo(() => buildAgentSummaries(agents, slices), [agents, slices]);
  const toggleStatusFilter = useCallback(
    (nextKey: ModelStatusKey) => setStatusFilter((prev) => (prev === nextKey ? null : nextKey)),
    []
  );
  const toggleTierFilter = useCallback(
    (nextTier: ModelTierKey) => setTierFilter((prev) => (prev === nextTier ? null : nextTier)),
    []
  );
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
                <button
                  type="button"
                  className={`model-panel__tier-toggle ${tierFilter === summary.agent.tierCategory ? "is-active" : ""}`}
                  onClick={() => toggleTierFilter(summary.agent.tierCategory)}
                  aria-label={`Filter ${summary.agent.tierCategory} agents`}
                  aria-pressed={tierFilter === summary.agent.tierCategory}
                >
                  <span className={`agent-pill__tier agent-pill__tier--${summary.agent.tier.toLowerCase()}`}>{summary.agent.tier}</span>
                </button>
                <div>
                  <strong>{summary.agent.name}</strong>
                  <div className="model-panel__status">
                    <span className={`status-dot status-dot--${summary.statusKey}`}>
                      <span className="status-dot__icon">{statusMeta?.icon}</span>
                      {statusMeta?.label}
                    </span>
                    {summary.primaryTask && (
                      <span className="model-panel__working">Working on {summary.primaryTask.taskNumber ?? summary.primaryTask.title}</span>
                    )}
                  </div>
                </div>
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
const AgentDetails: React.FC<{ agent: MissionAgent; events: MissionEvent[]; slices: MissionSlice[] }> = ({ agent, events, slices }) => {
  const timeline = useMemo(() => buildAgentTimeline(agent, slices, events), [agent, slices, events]);
  const intel = useMemo(() => buildAgentIntel(agent, slices, events), [agent, slices, events]);
  const [showLog, setShowLog] = useState(false);
  const statusKey = normalizeStatus(agent.status);

  return (
    <div className="mission-modal__section agent-panel">
      <header className="agent-panel__hero">
        <div>
          <p className="agent-panel__eyebrow">Section A — Basic Info</p>
          <h3>{agent.name}</h3>
          <p>{agent.summary ?? "No summary provided."}</p>
        </div>
        <div className="agent-panel__hero-badges">
          <span className={`agent-pill__tier agent-pill__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
          <span className={`agent-status-badge agent-status-badge--${statusKey}`}>{formatStatusLabel(agent.status)}</span>
        </div>
      </header>

      <section className="agent-detail__section">
        <header>
          <h4>Basic Info</h4>
        </header>
        <dl className="agent-detail__grid">
          <div>
            <dt>Vendor</dt>
            <dd>{agent.vendor ?? "Unknown"}</dd>
          </div>
          <div>
            <dt>Capability</dt>
            <dd>{agent.capability ?? agent.summary ?? "N/A"}</dd>
          </div>
          <div>
            <dt>Tier</dt>
            <dd>{agent.tier}</dd>
          </div>
        </dl>
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>State</h4>
        </header>
        <dl className="agent-detail__grid agent-detail__grid--state">
          <div>
            <dt>Current status</dt>
            <dd>{formatStatusLabel(agent.status)}</dd>
          </div>
          <div>
            <dt>Cooldown</dt>
            <dd>{intel.cooldownRemaining ?? agent.cooldownReason ?? "None"}</dd>
          </div>
          <div>
            <dt>Credit</dt>
            <dd>{intel.creditStatus ?? "unknown"}</dd>
          </div>
          <div>
            <dt>Rate limit window</dt>
            <dd>
              {intel.performance.rateLimitWindowSeconds
                ? `${intel.performance.rateLimitWindowSeconds}s`
                : agent.rateLimitWindowSeconds
                  ? `${agent.rateLimitWindowSeconds}s`
                  : "Not provided"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>Live Task</h4>
        </header>
        {intel.liveAssignment ? (
          <dl className="agent-detail__grid agent-detail__grid--tasks">
            <div>
              <dt>Task</dt>
              <dd>{intel.liveAssignment.title ?? intel.liveAssignment.taskId}</dd>
            </div>
            <div>
              <dt>Slice</dt>
              <dd>{intel.liveAssignment.sliceName ?? "Unknown slice"}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatStatusLabel(intel.liveAssignment.status)}</dd>
            </div>
            <div className="agent-detail__grid-span">
              <dt>Reason assigned</dt>
              <dd>{intel.liveAssignment.summary ?? "Assignment summary unavailable."}</dd>
            </div>
          </dl>
        ) : (
          <p className="agent-detail__empty">This model is not currently assigned.</p>
        )}
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>Recent Routing</h4>
        </header>
        <ul className="agent-routing">
          {intel.routingHistory.length > 0 ? (
            intel.routingHistory.map((entry) => (
              <li key={entry.id}>
                <span className={`agent-routing__badge agent-routing__badge--${entry.direction}`}>{entry.direction}</span>
                <div>
                  <p>{entry.label}</p>
                  <small>{entry.reason ?? "No reason provided"}</small>
                </div>
              </li>
            ))
          ) : (
            <li className="agent-detail__empty">No routing decisions recorded.</li>
          )}
        </ul>
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>Recent Tasks</h4>
        </header>
        <ul className="agent-recent">
          {intel.recentTasks.length > 0 ? (
            intel.recentTasks.map((task) => (
              <li key={task.id} className={`agent-recent__item agent-recent__item--${task.outcome}`}>
                <strong>{task.taskNumber ?? task.title}</strong>
                <span>{task.sliceName ?? "Unknown slice"}</span>
                <span>{task.runtimeSeconds ? `${task.runtimeSeconds}s` : "n/a"}</span>
            <span className="agent-recent__status">{formatStatusLabel(task.status)}</span>
              </li>
            ))
          ) : (
            <li className="agent-detail__empty">No tasks recorded for this agent.</li>
          )}
        </ul>
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>Performance & Limits</h4>
        </header>
        <dl className="agent-detail__grid">
          <div>
            <dt>Context window</dt>
            <dd>{intel.performance.contextWindow ? `${formatTokenCount(intel.performance.contextWindow)} tokens` : "Unknown"}</dd>
          </div>
          <div>
            <dt>Effective context</dt>
            <dd>{intel.performance.effectiveContextWindow ? `${formatTokenCount(intel.performance.effectiveContextWindow)} tokens` : "Unknown"}</dd>
          </div>
          <div>
            <dt>Avg runtime</dt>
            <dd>{intel.performance.avgRuntime}s</dd>
          </div>
          <div>
            <dt>p95 latency</dt>
            <dd>{intel.performance.p95Runtime}s</dd>
          </div>
          <div>
            <dt>Cost / run</dt>
            <dd>{intel.performance.costPerRunUsd ? `$${intel.performance.costPerRunUsd.toFixed(2)}` : "Unknown"}</dd>
          </div>
          <div>
            <dt>Cost / 1k tokens</dt>
            <dd>{intel.performance.costPer1kTokensUsd ? `$${intel.performance.costPer1kTokensUsd.toFixed(2)}` : "Unknown"}</dd>
          </div>
        </dl>
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>Token Stats</h4>
        </header>
        <dl className="agent-detail__grid">
          <div>
            <dt>Tokens today</dt>
            <dd>{intel.tokenStats.today.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Tokens lifetime</dt>
            <dd>{intel.tokenStats.lifetime.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Avg tokens / task</dt>
            <dd>{intel.tokenStats.average.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Peak tokens / task</dt>
            <dd>{intel.tokenStats.peak.toLocaleString()}</dd>
          </div>
        </dl>
      </section>

      <section className="agent-detail__section">
        <header>
          <h4>Warnings</h4>
        </header>
        {intel.warnings.length > 0 ? (
          <ul className="agent-warnings">
            {intel.warnings.slice(0, 2).map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <p className="agent-detail__empty">No warnings reported.</p>
        )}
      </section>

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

interface AgentAssignmentRecord {
  assignment: SliceAssignment;
  slice: MissionSlice;
}

interface AgentSummaryRecord {
  agent: MissionAgent;
  assigned: number;
  succeeded: number;
  failed: number;
  successRate: number;
  tokensUsed: number;
  avgRuntime: number;
  primaryTask: TaskSnapshot | null;
  statusKey: string;
  statusLabel: string;
  recentTasks: AgentRecentTask[];
  cooldownRemainingLabel: string | null;
  effectiveContextTokens?: number;
}

function buildAgentSummaries(agents: MissionAgent[], slices: MissionSlice[]): AgentSummaryRecord[] {
  return agents.map((agent) => {
    const assignmentRecords = collectAgentAssignments(agent, slices);
    const assignments = assignmentRecords.map((record) => record.assignment);

    const assigned = assignments.length;
    const succeeded = assignments.filter((assignment) => isCompleted(assignment.task.status)).length;
    const failed = assignments.filter((assignment) => assignment.isBlocking).length;
    const successRate = assigned === 0 ? 100 : Math.max(0, Math.round((succeeded / assigned) * 100));
    const tokensUsed = assignments.reduce((sum, assignment) => sum + (assignment.task.metrics?.tokensUsed ?? 0), 0);
    const avgRuntime = (() => {
      const samples = assignments.map((assignment) => assignment.task.metrics?.runtimeSeconds).filter((value): value is number => typeof value === "number");
      if (samples.length === 0) return 0;
      return Math.round(samples.reduce((acc, value) => acc + value, 0) / samples.length);
    })();

    const primaryTask = assignments.find((assignment) => ACTIVE_STATUSES.has(assignment.task.status))?.task ?? null;
    const statusKey = normalizeStatus(agent.status);
    const statusLabel = buildStatusLabel(agent.status, primaryTask);

    return {
      agent,
      assigned,
      succeeded,
      failed,
      successRate,
      tokensUsed,
      avgRuntime,
      primaryTask,
      statusKey,
      statusLabel,
      recentTasks: buildRecentTasks(assignmentRecords),
      cooldownRemainingLabel: calculateCooldownRemaining(agent),
      effectiveContextTokens: agent.effectiveContextWindowTokens ?? agent.contextWindowTokens,
    };
  });
}

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

function collectAgentAssignments(agent: MissionAgent, slices: MissionSlice[]): AgentAssignmentRecord[] {
  const records: AgentAssignmentRecord[] = [];
  slices.forEach((slice) => {
    slice.assignments.forEach((assignment) => {
      if (assignment.agent?.id === agent.id) {
        records.push({ assignment, slice });
      }
    });
  });
  return records;
}

function buildRecentTasks(records: AgentAssignmentRecord[]): AgentRecentTask[] {
  return records
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.assignment.task.updatedAt ?? 0).valueOf();
      const bDate = new Date(b.assignment.task.updatedAt ?? 0).valueOf();
      return bDate - aDate;
    })
    .slice(0, 5)
    .map(({ assignment, slice }) => {
      const status = assignment.task.status;
      const outcome = isCompleted(status) ? "success" : assignment.isBlocking ? "fail" : "active";
      return {
        id: assignment.task.id,
        title: assignment.task.title ?? "Untitled task",
        taskNumber: assignment.task.taskNumber,
        status,
        runtimeSeconds: assignment.task.metrics?.runtimeSeconds,
        outcome,
        updatedAt: assignment.task.updatedAt,
        sliceName: slice.name,
      };
    });
}

function calculateCooldownRemaining(agent: MissionAgent): string | null {
  if (!agent.cooldownExpiresAt) {
    return null;
  }
  const target = new Date(agent.cooldownExpiresAt).valueOf();
  const now = Date.now();
  if (Number.isNaN(target) || target <= now) {
    return "Ready";
  }
  return formatRelativeDuration(target - now);
}

function formatRelativeDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${Math.max(1, minutes)}m`;
}

function normalizeStatus(status: string) {
  const lower = (status ?? "").toLowerCase().trim();
  if (lower.includes("credit")) return "credit";
  if (lower.includes("cooldown") || lower.includes("cool down")) return "cooldown";
  if (lower.includes("issue") || lower.includes("error") || lower.includes("blocked")) return "issue";
  if (
    lower.includes("active") ||
    lower.includes("in_progress") ||
    lower.includes("in progress") ||
    lower.includes("working") ||
    lower.includes("running") ||
    lower.includes("received") ||
    lower.includes("receiving") ||
    lower.includes("processing")
  ) {
    return "active";
  }
  return "ready";
}

function buildStatusLabel(status: string, task: TaskSnapshot | null) {
  if (task) {
    return `${formatStatusLabel(status)} · Working on ${task.taskNumber ?? task.title}`;
  }
  return formatStatusLabel(status);
}

function formatStatusLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

const ROUTING_EVENT_TYPES = new Set(["route", "routing_decision", "retry", "reroute", "validation"]);

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











