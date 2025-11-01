import React, { CSSProperties } from "react";
import { MissionAgent, MissionSlice } from "../utils/mission";
import { FALLBACK_ICON } from "../utils/icons";

const ORBIT_PLACEHOLDERS = [0, 1];

interface SliceHubProps {
  slices: MissionSlice[];
  onSelectSlice: (slice: MissionSlice) => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

const SliceHub: React.FC<SliceHubProps> = ({ slices, onSelectSlice, onSelectAgent }) => {
  if (slices.length === 0) {
    return (
      <section className="slice-hub slice-hub--empty">
        <div className="slice-hub__grid slice-hub__grid--placeholder">
          {ORBIT_PLACEHOLDERS.map((index) => (
            <div key={index} className="slice-orbit slice-orbit--placeholder">
              <div className="slice-orbit__ring slice-orbit__ring--placeholder">
                <div className="slice-orbit__center slice-orbit__center--placeholder">
                  <span className="slice-placeholder__line slice-placeholder__line--title" />
                  <span className="slice-placeholder__line slice-placeholder__line--value" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="slice-placeholder__legend">
          <span>Mission slices will appear once telemetry syncs.</span>
        </div>
      </section>
    );
  }

  const featured = slices.slice(0, 2);
  const remainder = slices.slice(2);

  return (
    <section className="slice-hub">
      <div className="slice-hub__grid">
        {featured.map((slice) => (
          <SliceOrbit key={slice.id} slice={slice} onSelectSlice={onSelectSlice} onSelectAgent={onSelectAgent} />
        ))}
      </div>
      {remainder.length > 0 ? (
        <div className="slice-hub__list">
          {remainder.map((slice) => {
            const progress = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);
            return (
              <button key={slice.id} className="slice-mini" type="button" onClick={() => onSelectSlice(slice)}>
                <span className="slice-mini__name">{slice.name}</span>
                <span className="slice-mini__meter">
                  <span className="slice-mini__fill" style={{ width: `${progress}%`, backgroundColor: slice.accent }} />
                </span>
                <span className="slice-mini__value">{progress}%</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="slice-placeholder__legend slice-placeholder__legend--compact">
          <span>Additional slices will appear here.</span>
        </div>
      )}
    </section>
  );
};

interface SliceOrbitProps {
  slice: MissionSlice;
  onSelectSlice: (slice: MissionSlice) => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

const SliceOrbit: React.FC<SliceOrbitProps> = ({ slice, onSelectSlice, onSelectAgent }) => {
  const nodes = slice.agents.slice(0, 8);
  const progress = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);
  const accentStyle = {
    "--slice-accent": slice.accent,
    "--slice-progress": `${progress}%`,
  } as CSSProperties;

  return (
    <div className="slice-orbit">
      <div className="slice-orbit__ring" style={accentStyle}>
        <button className="slice-orbit__center" type="button" onClick={() => onSelectSlice(slice)}>
          <span className="slice-orbit__name">{slice.name}</span>
          <span className="slice-orbit__value">
            {slice.completed}/{slice.total}
          </span>
          <span className="slice-orbit__progress">{progress}%</span>
        </button>
        {nodes.map((agent, index) => {
          const angle = (360 / nodes.length) * index;
          const style = { "--orbit-angle": `${angle}deg` } as CSSProperties;
          return (
            <button
              key={agent.id}
              type="button"
              className="slice-orbit__node"
              style={style}
              onClick={() => onSelectAgent(agent)}
            >
              <img
                src={agent.icon}
                alt=""
                className="slice-orbit__avatar"
                loading="lazy"
                onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
              />
              <span className={`slice-orbit__badge slice-orbit__badge--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SliceHub;

