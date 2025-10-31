import React from 'react';
import { TaskSnapshot, FailureSnapshot } from '@core/types';

type TaskSummary = Record<string, number>;

interface SliceDockProps {
  tasks: TaskSnapshot[];
  failures: FailureSnapshot[];
  metrics: Record<string, number>;
  updatedAt: string;
  isLoading: boolean;
  onSelectTask?: (task: TaskSnapshot) => void;
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  received: 'Received',
  supervisor_review: 'Supervisor Review',
  testing: 'Testing',
  supervisor_approval: 'Awaiting Approval',
  ready_to_merge: 'Ready to Merge',
  complete: 'Complete',
  blocked: 'Blocked',
};

function summariseTasks(tasks: TaskSnapshot[]): TaskSummary {
  return tasks.reduce<TaskSummary>((acc, task) => {
    const key = task.status ?? 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

const SliceDock: React.FC<SliceDockProps> = ({ tasks, failures, metrics, updatedAt, isLoading, onSelectTask }) => {
  const summary = summariseTasks(tasks);
  const statuses = Object.keys(STATUS_LABELS);

  return (
    <div className="slice-dock">
      <header className="slice-dock__header">
        <div>
          <h2>Mission Slices</h2>
          <p className="slice-dock__meta">Updated {new Date(updatedAt).toLocaleString()}</p>
        </div>
        {isLoading && <span className="slice-dock__badge">Syncing…</span>}
      </header>
      <div className="slice-dock__grid">
        {statuses.map((status) => {
          const count = summary[status] ?? 0;
          return (
            <div key={status} className={`slice-dock__card slice-dock__card--${status}`}>
              <span className="slice-dock__count">{count}</span>
              <span className="slice-dock__label">{STATUS_LABELS[status]}</span>
            </div>
          );
        })}
      </div>
      <section className="slice-dock__list">
        <h3>Active Tasks</h3>
        {tasks.length === 0 ? (
          <p className="slice-dock__empty">No tasks yet — telemetry seeded for bootstrap.</p>
        ) : (
          <ul>
            {tasks.map((task) => (
              <li key={task.id}>
                <button type="button" onClick={() => onSelectTask?.(task)}>
                  <span className="slice-dock__task-title">{task.title}</span>
                  <span className={`slice-dock__status slice-dock__status--${task.status}`}>{STATUS_LABELS[task.status ?? 'assigned'] ?? task.status}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="slice-dock__metrics">
        <h3>Key Metrics</h3>
        {Object.keys(metrics).length === 0 ? (
          <p className="slice-dock__empty">Metrics will populate once agents start running.</p>
        ) : (
          <div className="slice-dock__metric-grid">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="slice-dock__metric">
                <span className="slice-dock__metric-label">{key.replace(/_/g, ' ')}</span>
                <span className="slice-dock__metric-value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="slice-dock__failures">
        <h3>Recent Failures</h3>
        {failures.length === 0 ? (
          <p className="slice-dock__empty">No failures logged — good news!</p>
        ) : (
          <ul>
            {failures.map((failure) => (
              <li key={failure.id}>
                <strong>{failure.title}</strong>
                <p>{failure.summary}</p>
                <span className="slice-dock__reason">{failure.reasonCode}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default SliceDock;
