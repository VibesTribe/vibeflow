import React from 'react';
import { MergeCandidate, FailureSnapshot, AgentSnapshot, TaskSnapshot } from '@core/types';

interface AgentOverviewModalProps {
  branches: MergeCandidate[];
  failures: FailureSnapshot[];
  selectedAgent: AgentSnapshot | null;
  selectedTask: TaskSnapshot | null;
  onClearSelection?: () => void;
}

const AgentOverviewModal: React.FC<AgentOverviewModalProps> = ({
  branches,
  failures,
  selectedAgent,
  selectedTask,
  onClearSelection,
}) => {
  return (
    <section className="agent-overview">
      <header className="agent-overview__header">
        <h2>Mission Overview</h2>
        {(selectedAgent || selectedTask) && (
          <button type="button" className="agent-overview__clear" onClick={onClearSelection}>
            Clear selection
          </button>
        )}
      </header>

      <div className="agent-overview__section">
        <h3>Selected Agent</h3>
        {selectedAgent ? (
          <div className="agent-overview__card">
            <h4>{selectedAgent.name}</h4>
            <p className="agent-overview__status">Status: {selectedAgent.status}</p>
            <p>{selectedAgent.summary}</p>
          </div>
        ) : (
          <p className="agent-overview__empty">Select an agent from the hangar to inspect details.</p>
        )}
      </div>

      <div className="agent-overview__section">
        <h3>Selected Task</h3>
        {selectedTask ? (
          <div className="agent-overview__card">
            <h4>{selectedTask.title}</h4>
            <p className="agent-overview__status">Status: {selectedTask.status}</p>
            <p>Confidence: {(selectedTask.confidence * 100).toFixed(1)}%</p>
          </div>
        ) : (
          <p className="agent-overview__empty">Tap a task in the slice dock to pin it here.</p>
        )}
      </div>

      <div className="agent-overview__section">
        <h3>Merge Candidates</h3>
        {branches.length === 0 ? (
          <p className="agent-overview__empty">No branches ready to merge yet.</p>
        ) : (
          <ul className="agent-overview__list">
            {branches.map((branch) => (
              <li key={branch.branch}>
                <strong>{branch.branch}</strong>
                <p>{branch.summary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="agent-overview__section">
        <h3>Recent Failures</h3>
        {failures.length === 0 ? (
          <p className="agent-overview__empty">No failures reported.</p>
        ) : (
          <ul className="agent-overview__list">
            {failures.slice(0, 4).map((failure) => (
              <li key={failure.id}>
                <strong>{failure.title}</strong>
                <p>{failure.summary}</p>
                <span className="agent-overview__reason">{failure.reasonCode}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default AgentOverviewModal;
