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
    <aside className="mission-panel mission-panel--left">
      <div className="mission-panel__sticky">
        <div className="mission-panel__actions">
          <button type="button" onClick={onViewLogs} className="mission-button mission-button--ghost">
            View Logs
          </button>
          <button type="button" onClick={onViewDocs} className="mission-button mission-button--primary">
            Docs
          </button>
        </div>
        <h2 className="mission-panel__title">Slice Dock</h2>
      </div>
      <div className="mission-panel__scroll">
        {loading && slices.length === 0 && <p className="mission-empty">Syncing telemetry.</p>}
        {slices.map((slice) => {
          const progress = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);
          const chipStyle = {
            "--slice-accent": slice.accent,
          } as CSSProperties;
          const ringStyle: CSSProperties = {
            background: `conic-gradient(${slice.accent} ${progress}%, rgba(255, 255, 255, 0.08) ${progress}% 100%)`,
          };

          return (
            <button
              key={slice.id}
              type="button"
              onClick={() => onSelectSlice(slice)}
              className="slice-chip"
              style={chipStyle}
            >
              <span className="slice-chip__ring" style={ringStyle}>
                <span>{progress}%</span>
              </span>
              <div className="slice-chip__body">
                <strong>{slice.name}</strong>
                <span>
                  {slice.completed}/{slice.total} tasks
                </span>
              </div>
            </button>
          );
        })}
        {slices.length === 0 && !loading && <p className="mission-empty">No slices yet - missions will populate here.</p>}
      </div>
    </aside>
  );
};

export default SliceDockPanel;
