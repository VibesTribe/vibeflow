import React, { CSSProperties } from "react";
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
        <button type="button" onClick={onViewDocs} className="rail__button rail__button--primary">
          Docs
        </button>
        <span className="rail__title">Slices</span>
      </div>
      <div className="rail__scroll">
        {loading && slices.length === 0 && <p className="rail__empty">Syncing telemetry...</p>}
        {slices.map((slice) => {
          const progress = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);
          const accent = slice.accent ?? "rgba(56, 189, 248, 0.95)";
          const ringStyle: CSSProperties = {
            background: `conic-gradient(${accent} ${progress}%, rgba(12, 23, 42, 0.85) ${progress}% 100%)`,
          };

          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => onSelectSlice(slice)}
              className="slice-dial"
              aria-label={`Open ${slice.name}`}
            >
              <span className="slice-dial__ring" style={ringStyle}>
                <span className="slice-dial__inner">
                  <span className="slice-dial__percent">{progress}%</span>
                  <span className="slice-dial__tasks">
                    {slice.completed}/{slice.total}
                  </span>
                </span>
              </span>
              <span className="slice-dial__label">{slice.name}</span>
            </button>
          );
        })}
        {slices.length === 0 && !loading && <p className="rail__empty">No slices yet.</p>}
      </div>
    </aside>
  );
};

export default SliceDockPanel;
