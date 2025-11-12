import React, { FormEvent, useMemo, useState } from "react";
import { MissionEvent } from "../../../../src/utils/events";
import { MissionAgent, MissionSlice, SliceAssignment } from "../../utils/mission";
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
}

const DOC_LINKS = [
  { label: "Product Requirements (PRD)", path: "/docs/overview.html" },
  { label: "System Plan", path: "/docs/system_plan_v5.html" },
  { label: "Runbook", path: "/docs/runbook.html" },
];

const ACTIVE_STATUSES = new Set([
  "assigned",
  "in_progress",
  "received",
  "supervisor_review",
  "testing",
  "supervisor_approval",
]);

const MissionModals: React.FC<MissionModalsProps> = ({ modal, onClose, events, agents, slices }) => {
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
      content = <SliceDetails slice={modal.slice} events={events} />;
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
  <div className="mission-modal__section">
    <h3>Recent Logs</h3>
    <ul className="mission-log-list">
      {events.slice(0, 40).map((event) => {
        const detailMessage = extractEventMessage(event);
        const eventLabel = formatEventLabel(event.type);
        return (
          <li key={event.id}>
            <span className={`mission-log__bullet mission-log__bullet--${inferLogTone(event)}`} />
            <div>
              <strong>{eventLabel}</strong>
              <span>{new Date(event.timestamp).toLocaleString()}</span>
              {detailMessage && <p>{detailMessage}</p>}
            </div>
          </li>
        );
      })}
      {events.length === 0 && <li>No events yet.</li>}
    </ul>
  </div>
);

const ModelOverview: React.FC<{ agents: MissionAgent[]; slices: MissionSlice[] }> = ({ agents, slices }) => {
  const agentSummaries = useMemo(() => buildAgentSummaries(agents, slices), [agents, slices]);

  return (
    <div className="mission-modal__section model-panel">
      <header className="model-panel__legend">
        <span className="status-dot status-dot--ready">Ready</span>
        <span className="status-dot status-dot--cooldown">Cooldown</span>
        <span className="status-dot status-dot--credit">Credit Needed</span>
        <span className="status-dot status-dot--issue">Issue</span>
      </header>
      <ul className="model-panel__list">
        {agentSummaries.map((summary) => (
          <li key={summary.agent.id} className={`model-panel__item model-panel__item--${summary.statusKey}`}>
            <div className="model-panel__header">
              <span className={`agent-pill__tier agent-pill__tier--${summary.agent.tier.toLowerCase()}`}>{summary.agent.tier}</span>
              <div>
                <strong>{summary.agent.name}</strong>
                <p>{summary.statusLabel}</p>
              </div>
            </div>
            <div className="model-panel__metrics">
              <p>
                Assigned <strong>{summary.assigned}</strong> � Succeeded <strong>{summary.succeeded}</strong> � Failed <strong>{summary.failed}</strong>{ }
                <span className={`model-panel__success model-panel__success--${summary.statusKey}`}>Success {summary.successRate}%</span>
              </p>
              {summary.primaryTask && (
                <p className="model-panel__task">
                  Working � {summary.primaryTask.taskNumber ?? summary.primaryTask.title}
                </p>
              )}
              {summary.agent.cooldownReason && <p className="model-panel__hint">{summary.agent.cooldownReason}</p>}
              <p className="model-panel__foot">Tokens used: {summary.tokensUsed.toLocaleString()} � Avg response: {summary.avgRuntime}s</p>
            </div>
          </li>
        ))}
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

  return (
    <div className="mission-modal__section agent-panel">
      <header className="agent-panel__header">
        <div>
          <h3>{agent.name}</h3>
          <p>{agent.summary ?? "No summary provided."}</p>
        </div>
        <span className={`agent-pill__tier agent-pill__tier--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
      </header>
      <dl className="agent-panel__stats">
        <div>
          <dt>Status</dt>
          <dd>{agent.status}</dd>
        </div>
        <div>
          <dt>Current tasks</dt>
          <dd>{timeline.activeAssignments.length}</dd>
        </div>
        <div>
          <dt>Success rate</dt>
          <dd>{timeline.successRate}%</dd>
        </div>
        <div>
          <dt>Tokens used</dt>
          <dd>{timeline.tokensUsed.toLocaleString()}</dd>
        </div>
      </dl>
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
  supervisor_review: { label: "Needs Review", tone: "flagged", icon: "\u2691", accent: "#fb923c" },
  supervisor_approval: { label: "Awaiting Approval", tone: "flagged", icon: "\u2691", accent: "#fbbf24" },
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

const SliceDetails: React.FC<{ slice: MissionSlice; events: MissionEvent[] }> = ({ slice, events }) => {
  const [selectedTask, setSelectedTask] = useState<TaskSnapshot | null>(null);

  const assignmentsByTask = useMemo(() => {
    const map = new Map<string, SliceAssignment>();
    slice.assignments.forEach((assignment) => map.set(assignment.task.id, assignment));
    return map;
  }, [slice.assignments]);

  const handleJumpToTask = (taskId: string) => {
    const assignmentMatch = slice.assignments.find((assignment) => assignment.task.id === taskId);
    if (assignmentMatch) {
      setSelectedTask(assignmentMatch.task);
      return;
    }
    const fallback = slice.tasks.find((task) => task.id === taskId);
    if (fallback) {
      setSelectedTask(fallback);
    }
  };

  return (
    <div className="mission-modal__section slice-panel">
      <header className="slice-panel__header">
        <div>
          <h3>{slice.name}</h3>
          <p>
            {slice.completed}/{slice.total} complete {"\u00B7"} {slice.active} active
          </p>
        </div>
        <button type="button" className="slice-panel__cta" onClick={() => setSelectedTask(null)}>
          Collapse all
        </button>
      </header>
      <div className="slice-panel__content slice-panel__content--stacked">
        <ul className="slice-task-list">
          {slice.assignments.map((assignment) => {
            const isOpen = selectedTask?.id === assignment.task.id;
            const assignmentRecord = assignmentsByTask.get(assignment.task.id) ?? null;
            const statusMeta = resolveStatusMeta(assignment.task.status);
            return (
              <li key={assignment.task.id} className={isOpen ? "is-open" : undefined}>
                <button
                  type="button"
                  className={isOpen ? "is-selected" : undefined}
                  onClick={() => setSelectedTask((prev) => (prev?.id === assignment.task.id ? null : assignment.task))}
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
                    <span className="slice-task-list__meta" style={{ color: statusMeta.accent }}>
                      {statusMeta.label ?? assignment.task.status.replace(/_/g, " ")}
                    </span>
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

const TaskDetail: React.FC<{ task: TaskSnapshot; assignment: SliceAssignment | null; events: MissionEvent[]; onJumpToTask: (taskId: string) => void }> = ({ task, assignment, events, onJumpToTask }) => {
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

function buildAgentSummaries(agents: MissionAgent[], slices: MissionSlice[]) {
  return agents.map((agent) => {
    const assignments: SliceAssignment[] = [];
    slices.forEach((slice) => {
      slice.assignments.forEach((assignment) => {
        if (assignment.agent?.id === agent.id) {
          assignments.push(assignment);
        }
      });
    });

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
    };
  });
}

function buildAgentTimeline(agent: MissionAgent, slices: MissionSlice[], events: MissionEvent[]) {
  const assignments: SliceAssignment[] = [];
  slices.forEach((slice) => {
    slice.assignments.forEach((assignment) => {
      if (assignment.agent?.id === agent.id) {
        assignments.push(assignment);
      }
    });
  });

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

function normalizeStatus(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes("credit")) return "credit";
  if (lower.includes("cooldown")) return "cooldown";
  if (lower.includes("issue") || lower.includes("error") || lower.includes("blocked")) return "issue";
  if (lower.includes("working") || lower.includes("in_progress") || lower.includes("running")) return "ready";
  return "ready";
}

function buildStatusLabel(status: string, task: TaskSnapshot | null) {
  if (task) {
    return `${status} � Working on ${task.taskNumber ?? task.title}`;
  }
  return status;
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

function formatEventLabel(value?: string) {
  if (!value) return "Update";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function isCompleted(status: TaskSnapshot["status"]) {
  return status === "ready_to_merge" || status === "complete" || status === "supervisor_approval";
}









