import React from "react";
import { MissionSlice } from "../utils/mission";

interface SliceDockPanelProps {
  slices: MissionSlice[];
  loading: boolean;
  onViewDocs: () => void;
  onViewLogs: () => void;
  onSelectSlice: (slice: MissionSlice) => void;
}

const SliceDockPanel: React.FC<SliceDockPanelProps> = ({ slices, loading, onViewDocs, onViewLogs, onSelectSlice }) => {
  return (
    <aside className="rail rail--left" aria-label="Slice dock">
      <div className="rail__header">
        <button type="button" onClick={onViewLogs} className="rail__button rail__button--ghost">
          Logs
        </button>
        <button type="button" onClick={onViewDocs} className="rail__button rail__button--ghost">
          Docs
        </button>
        <span className="rail__title">Slice Dock</span>
      </div>
      <div className="rail__scroll">
        {loading && slices.length === 0 && <p className="rail__empty">Syncing telemetry...</p>}
        {slices.map((slice) => {
          const completion = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);
          const accent = slice.total > 0 && slice.completed >= slice.total ? "#22c55e" : slice.accent;
          return (
            <button key={slice.id} type="button" onClick={() => onSelectSlice(slice)} className="slice-dial" aria-label={`Open ${slice.name}`}>
              <span className="slice-dial__ring" style={{ background: `conic-gradient(${accent} ${completion}%, rgba(12, 23, 42, 0.85) 0)` }}>
              <span className="slice-dial__inner">
                <span className="slice-dial__percent">
                  {completion}%
                </span>
                <span className="slice-dial__tasks">
                  {slice.completed}/{slice.total}
                </span>
              </span>
            </span>
            <span className="slice-dial__label">{slice.name}</span>
            <span className="slice-dial__meta">
              {slice.active} active {"\u00B7"} {slice.blocked} blocked
            </span>
            {slice.tokens !== undefined && <span className="slice-dial__tokens">{formatTokenCount(slice.tokens)} TOKENS</span>}
          </button>
          );
        })}
        {slices.length === 0 && !loading && <p className="rail__empty">No slices yet.</p>}
      </div>
    </aside>
  );
};

export default SliceDockPanel;

function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (tokens >= 10_000) {
    return `${Math.round(tokens / 1_000)}K`;
  }
  return tokens.toLocaleString();
}

