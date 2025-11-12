import React, { CSSProperties, useMemo } from "react";
import { MissionAgent, MissionSlice, SliceAssignment } from "../utils/mission";
import { TaskSnapshot } from "@core/types";
import { FALLBACK_ICON } from "../utils/icons";

const ACTIVE_STATUSES = new Set([
  "assigned",
  "in_progress",
  "received",
  "supervisor_review",
  "testing",
  "supervisor_approval",
]);

const CANVAS_SIZE = 220;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const ORBIT_RING_RADIUS = 64;
const NODE_RADIUS = 96;
const FAR_ORBIT_BOOST = { medium: 6, dense: 10 };
const MAX_ORBIT_AGENTS = 8;

interface SliceHubProps {
  slices: MissionSlice[];
  onSelectSlice: (slice: MissionSlice) => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

const SliceHub: React.FC<SliceHubProps> = ({ slices, onSelectSlice, onSelectAgent }) => {
  const orderedSlices = useMemo(() => {
    if (slices.length === 0) {
      return [];
    }
    return slices.slice().sort((a, b) => b.active - a.active || b.total - a.total);
  }, [slices]);

  if (orderedSlices.length === 0) {
    return (
      <section className="slice-hub slice-hub--empty">
        <p>No slices yet. Once telemetry syncs, active missions will appear here.</p>
      </section>
    );
  }

  return (
    <section className="slice-hub">
      <div className="slice-hub__grid">
        {orderedSlices.map((slice) => (
          <SliceOrbit key={slice.id} slice={slice} onSelectSlice={onSelectSlice} onSelectAgent={onSelectAgent} />
        ))}
      </div>
    </section>
  );
};

interface SliceOrbitProps {
  slice: MissionSlice;
  onSelectSlice: (slice: MissionSlice) => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

type OrbitPosition = {
  assignment: SliceAssignment;
  x: number;
  y: number;
  angleDeg: number;
  angleRad: number;
  startX: number;
  startY: number;
};

const SliceOrbit: React.FC<SliceOrbitProps> = ({ slice, onSelectSlice, onSelectAgent }) => {
  const progress = slice.total === 0 ? 0 : Math.min(100, Math.round((slice.completed / slice.total) * 100));

  const orbitAssignments = useMemo(() => buildOrbitAssignments(slice), [slice]);

  const orbitPositions = useMemo<OrbitPosition[]>(() => {
    const withAgents = orbitAssignments.filter((assignment) => assignment.agent);
    if (withAgents.length === 0) {
      return [];
    }
    const total = withAgents.length;
    const boost =
      total >= 7 ? FAR_ORBIT_BOOST.dense : total >= 5 ? FAR_ORBIT_BOOST.medium : 0;
    const ringRadius = ORBIT_RING_RADIUS + boost;
    const nodeRadius = NODE_RADIUS + boost;
    return withAgents.map((assignment, index) => {
      const angleFraction = total === 1 ? 0 : index / total;
      const angleDeg = angleFraction * 360 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const connectorStartX = CANVAS_CENTER + ringRadius * Math.cos(angleRad);
      const connectorStartY = CANVAS_CENTER + ringRadius * Math.sin(angleRad);
      const x = CANVAS_CENTER + nodeRadius * Math.cos(angleRad);
      const y = CANVAS_CENTER + nodeRadius * Math.sin(angleRad);
      return { assignment, angleDeg, angleRad, x, y, startX: connectorStartX, startY: connectorStartY };
    });
  }, [orbitAssignments]);

  const accent = slice.total > 0 && slice.completed >= slice.total ? "#22c55e" : slice.accent;
  return (
    <article className="slice-orbit-card">
      <div className="slice-orbit-card__body">
        <div
          className="slice-orbit"
          style={{ "--slice-accent": accent, "--slice-progress": `${progress}%` } as CSSProperties}
        >
          <svg className="slice-orbit__connections" viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`} aria-hidden="true">
            {orbitPositions.map(({ assignment, x, y, startX, startY }) => {
              const locationKind = assignment.task.location?.kind ?? "internal";
              const connectorKey = `${assignment.task.id}-${assignment.agent?.id ?? "connector"}`;
              return (
                <line
                  key={connectorKey}
                  x1={startX}
                  y1={startY}
                  x2={x}
                  y2={y}
                  className={`slice-orbit__connector slice-orbit__connector--${locationKind}`}
                />
              );
            })}
          </svg>
          <OrbitCenter slice={slice} progress={progress} onClick={() => onSelectSlice(slice)} />
          {orbitPositions.map((position) => (
            <OrbitNode key={`${position.assignment.task.id}-${position.assignment.agent?.id ?? "node"}`} position={position} onSelectAgent={onSelectAgent} />
          ))}
        </div>
      </div>
    </article>
  );
};

const OrbitCenter: React.FC<{ slice: MissionSlice; progress: number; onClick: () => void }> = ({ slice, progress, onClick }) => {
  return (
    <button type="button" className="slice-orbit__center" onClick={onClick}>
      <span className="slice-orbit__progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </span>
      <span className="slice-orbit__name">{slice.name}</span>
      <span className="slice-orbit__value">
        {slice.completed}/{slice.total}
      </span>
      {slice.tokens !== undefined && <span className="slice-orbit__tokens">{slice.tokens.toLocaleString()} tokens</span>}
    </button>
  );
};

interface OrbitNodeProps {
  position: OrbitPosition;
  onSelectAgent: (agent: MissionAgent) => void;
}

const OrbitNode: React.FC<OrbitNodeProps> = ({ position, onSelectAgent }) => {
  const { assignment, x, y, angleRad } = position;
  const agent = assignment.agent;
  if (!agent) {
    return null;
  }

  const quadrant = Math.cos(angleRad) >= 0 ? "east" : "west";
  const vertical = Math.sin(angleRad) >= 0 ? "south" : "north";

  return (
    <button
      type="button"
      className={`slice-orbit__node slice-orbit__node--${quadrant} slice-orbit__node--${vertical}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      onClick={() => onSelectAgent(agent)}
    >
      <span className="slice-orbit__core">
        <span className={`slice-orbit__halo slice-orbit__halo--${agent.tier.toLowerCase()}`} />
        <img
          src={agent.icon || FALLBACK_ICON}
          alt={agent.name}
          className="slice-orbit__avatar"
          loading="lazy"
          decoding="async"
          onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
        />
        <span className={`slice-orbit__badge slice-orbit__badge--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
      </span>
      <span className="slice-orbit__task">{assignment.task.taskNumber ?? assignment.task.title}</span>
      <span className="slice-orbit__model" aria-hidden="true">
        {agent.name}
      </span>
      {assignment.isBlocking && <span className="slice-orbit__alert">!</span>}
    </button>
  );
};

function buildOrbitAssignments(slice: MissionSlice): SliceAssignment[] {
  const activeAssignments = slice.assignments.filter((assignment) => ACTIVE_STATUSES.has(assignment.task.status) && assignment.agent);
  if (activeAssignments.length > 0) {
    return activeAssignments.slice(0, MAX_ORBIT_AGENTS);
  }

  const fallbackTask: TaskSnapshot =
    slice.tasks[0] ?? {
      id: `${slice.id}-placeholder`,
      title: slice.name,
      status: "assigned",
      confidence: 1,
      updatedAt: slice.assignments[0]?.task.updatedAt ?? new Date().toISOString(),
    };

  if (slice.agents.length === 0) {
    return [];
  }

  return slice.agents.slice(0, MAX_ORBIT_AGENTS).map((agent) => ({ task: fallbackTask, agent, isBlocking: false }));
}

export default SliceHub;



