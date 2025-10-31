import React, { FormEvent, useMemo, useState } from "react";
import { MissionEvent } from "../../../../src/utils/events";
import { MissionAgent, MissionSlice } from "../../utils/mission";
import { TaskSnapshot } from "@core/types";

export type MissionModalState =
  | { type: null }
  | { type: "docs" }
  | { type: "logs" }
  | { type: "models" }
  | { type: "agent"; agent: MissionAgent }
  | { type: "slice"; slice: MissionSlice }
  | { type: "add" };

interface MissionModalsProps {
  modal: MissionModalState;
  onClose: () => void;
  events: MissionEvent[];
  agents: MissionAgent[];
}

const DOC_LINKS = [
  { label: "Product Requirements (PRD)", path: "/docs/overview.html" },
  { label: "System Plan", path: "/docs/system_plan_v5.html" },
  { label: "Runbook", path: "/docs/runbook.html" },
];

const MissionModals: React.FC<MissionModalsProps> = ({ modal, onClose, events, agents }) => {
  if (modal.type === null) {
    return null;
  }

  let content: React.ReactNode = null;
  switch (modal.type) {
    case "docs":
      content = (
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
      break;
    case "logs":
      content = (
        <div className="mission-modal__section">
          <h3>Recent Logs</h3>
          <ul className="mission-log-list">
            {events.slice(0, 20).map((event) => {
              const detailMessage = extractEventMessage(event);
              return (
                <li key={event.id}>
                  <span className={`mission-log__bullet mission-log__bullet--${inferLogTone(event)}`} />
                  <div>
                    <strong>{event.type}</strong>
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
      break;
    case "models":
      content = (
        <div className="mission-modal__section">
          <h3>Models & Platforms</h3>
          <ul className="mission-agent-list">
            {agents.map((agent) => (
              <li key={agent.id}>
                <img src={agent.icon} alt="" />
                <div>
                  <strong>{agent.name}</strong>
                  <span>Status: {agent.status ?? "idle"}</span>
                </div>
                <span className={`badge badge--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
              </li>
            ))}
            {agents.length === 0 && <li>No agents registered.</li>}
          </ul>
        </div>
      );
      break;
    case "agent":
      content = <AgentDetails agent={modal.agent} />;
      break;
    case "slice":
      content = <SliceDetails slice={modal.slice} />;
      break;
    case "add":
      content = <AddAgentForm onClose={onClose} />;
      break;
    default:
      content = null;
  }

  return (
    <div className="mission-modal__overlay" role="dialog" aria-modal="true">
      <div className="mission-modal">
        <button type="button" className="mission-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
        {content}
      </div>
    </div>
  );
};

export default MissionModals;

const AgentDetails: React.FC<{ agent: MissionAgent }> = ({ agent }) => {
  return (
    <div className="mission-modal__section">
      <h3>{agent.name}</h3>
      <div className="agent-detail">
        <img src={agent.icon} alt="" />
        <div>
          <p>Tier: {agent.tier}</p>
          <p>Status: {agent.status ?? "idle"}</p>
          <p>ID: {agent.id}</p>
        </div>
      </div>
      <p className="mission-modal__hint">Detailed metrics will populate as missions run.</p>
    </div>
  );
};

const SliceDetails: React.FC<{ slice: MissionSlice }> = ({ slice }) => {
  const tasks = useMemo(() => slice.tasks, [slice.tasks]);
  return (
    <div className="mission-modal__section">
      <h3>{slice.name}</h3>
      <ul className="task-list">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        {tasks.length === 0 && <li>No tasks assigned yet.</li>}
      </ul>
    </div>
  );
};

const TaskRow: React.FC<{ task: TaskSnapshot }> = ({ task }) => {
  return (
    <li className="task-row">
      <div>
        <strong>{task.title}</strong>
        <span className={`task-status task-status--${task.status}`}>{task.status}</span>
      </div>
      <span className="task-row__meta">Confidence {Math.round(task.confidence * 100)}%</span>
    </li>
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
