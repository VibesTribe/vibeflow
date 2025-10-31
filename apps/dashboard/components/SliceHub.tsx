import React, { CSSProperties } from "react";
import { MissionAgent, MissionSlice } from "../utils/mission";
import { FALLBACK_ICON } from "../utils/icons";

interface SliceHubProps {
  slices: MissionSlice[];
  onSelectSlice: (slice: MissionSlice) => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

const SliceHub: React.FC<SliceHubProps> = ({ slices, onSelectSlice, onSelectAgent }) => {
  const featured = slices.slice(0, 2);
  const remainder = slices.slice(2);

  return (
    <section className="slice-hub">
      <div className="slice-hub__grid">
        {featured.map((slice) => (
          <SliceOrbit key={slice.id} slice={slice} onSelectSlice={onSelectSlice} onSelectAgent={onSelectAgent} />
        ))}
      </div>
      {remainder.length > 0 && (
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
