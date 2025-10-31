import React from 'react';

export interface RunMetricEntry {
  id: string;
  started_at: string;
  status: string;
  notes?: string;
}

interface ModelAnalyticsViewProps {
  runs: RunMetricEntry[];
  updatedAt: string;
  loading?: boolean;
}

const statusClassName = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'model-analytics__status model-analytics__status--completed';
    case 'failed':
      return 'model-analytics__status model-analytics__status--failed';
    case 'pending':
    default:
      return 'model-analytics__status model-analytics__status--pending';
  }
};

const ModelAnalyticsView: React.FC<ModelAnalyticsViewProps> = ({ runs, updatedAt, loading }) => {
  return (
    <section className="model-analytics">
      <header className="model-analytics__header">
        <div>
          <h2>Model Analytics</h2>
          <p className="model-analytics__meta">Metrics updated {new Date(updatedAt).toLocaleString()}</p>
        </div>
        {loading && <span className="model-analytics__badge">Syncing…</span>}
      </header>
      {runs.length === 0 ? (
        <p className="model-analytics__empty">Waiting for the first run to complete.</p>
      ) : (
        <table className="model-analytics__table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Started</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 6).map((run) => (
              <tr key={run.id}>
                <td>{run.id}</td>
                <td>{new Date(run.started_at).toLocaleString()}</td>
                <td><span className={statusClassName(run.status)}>{run.status}</span></td>
                <td>{run.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default ModelAnalyticsView;
