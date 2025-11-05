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

interface SliceHubProps {
  slices: MissionSlice[];
  onSelectSlice: (slice: MissionSlice) => void;
  onSelectAgent: (agent: MissionAgent) => void;
}

const SliceHub: React.FC<SliceHubProps> = ({ slices, onSelectSlice, onSelectAgent }) => {
  if (slices.length === 0) {
    return (
      <section className="slice-hub slice-hub--empty">
        <p>No slices yet. Once telemetry syncs, active missions will appear here.</p>
      </section>
    );
  }

  return (
    <section className="slice-hub">
      <div className="slice-hub__grid">
        {slices.map((slice) => (
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

const SliceOrbit: React.FC<SliceOrbitProps> = ({ slice, onSelectSlice, onSelectAgent }) => {
  const progress = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);

  const orbitAssignments = useMemo(() => {
    const actives = slice.assignments.filter((assignment) => ACTIVE_STATUSES.has(assignment.task.status));
    if (actives.length > 0) {
      return actives.slice(0, 8);
    }
    const fallbackTask: TaskSnapshot =
      slice.tasks[0] ?? {
        id: `${slice.id}-placeholder`,
        title: slice.name,
        status: "assigned",
        confidence: 1,
        updatedAt: slice.assignments[0]?.task.updatedAt ?? new Date().toISOString(),
      };
    return slice.agents.slice(0, 8).map((agent) => ({ task: fallbackTask, agent, isBlocking: false } as SliceAssignment));
  }, [slice.assignments, slice.agents, slice.tasks, slice.id, slice.name]);

  return (
    <article className="slice-orbit-card">
      <header className="slice-orbit-card__header">
        <div>
          <h3>{slice.name}</h3>
          <p>{slice.active} active · {slice.completed} complete · {slice.total} total</p>
        </div>
        <button type="button" className="slice-orbit-card__cta" onClick={() => onSelectSlice(slice)}>
          View slice
        </button>
      </header>
      <div className="slice-orbit-card__body">
        <div className="slice-orbit" style={{ "--slice-accent": slice.accent } as CSSProperties}>
          <OrbitCenter slice={slice} progress={progress} onClick={() => onSelectSlice(slice)} />
          {orbitAssignments.map((assignment, index) => (
            <OrbitNode key={`${assignment.task.id}-${assignment.agent?.id ?? index}`} index={index} total={orbitAssignments.length} assignment={assignment} onSelectAgent={onSelectAgent} />
          ))}
        </div>
        <ul className="slice-orbit-card__tasks">
          {slice.assignments.slice(0, 3).map((assignment) => (
            <li key={`detail-${assignment.task.id}`}>
              <button type="button" onClick={() => onSelectSlice(slice)}>
                <span className={`task-chip task-chip--${assignment.task.status}`}>{assignment.task.taskNumber ?? assignment.task.title}</span>
                <span className="task-chip__summary">{assignment.task.summary ?? assignment.task.title}</span>
              </button>
            </li>
          ))}
        </ul>
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
      <span className="slice-orbit__value">{slice.completed}/{slice.total}</span>
      {slice.tokens !== undefined && <span className="slice-orbit__tokens">{slice.tokens.toLocaleString()} tokens</span>}
    </button>
  );
};

interface OrbitNodeProps {
  assignment: SliceAssignment;
  index: number;
  total: number;
  onSelectAgent: (agent: MissionAgent) => void;
}

const OrbitNode: React.FC<OrbitNodeProps> = ({ assignment, index, total, onSelectAgent }) => {
  const agent = assignment.agent;
  if (!agent) {
    return null;
  }

  const angle = (360 / total) * index;
  const style = {
    "--orbit-angle": `${angle}deg`,
  } as CSSProperties;

  const locationLabel = assignment.task.location?.label ?? "Internal";
  const locationKind = assignment.task.location?.kind ?? "internal";

  return (
    <button type="button" className="slice-orbit__node" style={style} onClick={() => onSelectAgent(agent)}>
      <span className={`slice-orbit__link slice-orbit__link--${locationKind}`} aria-hidden="true" />
      <img
        src={agent.icon || FALLBACK_ICON}
        alt={agent.name}
        className="slice-orbit__avatar"
        loading="lazy"
        decoding="async"
        onError={(event) => (event.currentTarget.src = FALLBACK_ICON)}
      />
      <span className={`slice-orbit__badge slice-orbit__badge--${agent.tier.toLowerCase()}`}>{agent.tier}</span>
      <span className="slice-orbit__task">{assignment.task.taskNumber ?? assignment.task.title}</span>
      <span className={`slice-orbit__location slice-orbit__location--${locationKind}`}>{locationLabel}</span>
      {assignment.isBlocking && <span className="slice-orbit__alert">!</span>}
    </button>
  );
};

export default SliceHub;


