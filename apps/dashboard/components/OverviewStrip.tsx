/**
 * vibeflow-meta:
 * id: apps/dashboard/components/OverviewStrip.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: overview-strip
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:overview-strip */
import React from "react";

interface OverviewStripProps {
  metrics: Record<string, number>;
  updatedAt: string;
  isLoading: boolean;
}

const OverviewStrip: React.FC<OverviewStripProps> = ({ metrics, updatedAt, isLoading }) => {
  const entries = Object.entries(metrics);
  return (
    <div className="metric-grid">
      {isLoading && entries.length === 0 ? (
        <div>Loading latest mission state…</div>
      ) : (
        entries.map(([label, value]) => (
          <div className="metric" key={label}>
            <span className="metric-label">{label.replace(/_/g, " ")}</span>
            <span className="metric-value">{value.toFixed(2)}</span>
          </div>
        ))
      )}
      <div className="metric">
        <span className="metric-label">Last Sync</span>
        <span className="metric-value">{new Date(updatedAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

export default OverviewStrip;
/* @endeditable */
