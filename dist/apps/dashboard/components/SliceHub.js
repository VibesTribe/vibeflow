import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { FALLBACK_ICON } from "../utils/icons";
const ACTIVE_STATUSES = new Set([
    "pending",
    "in_progress",
    "received",
    "review",
    "testing",
    "merge_pending",
]);
const CANVAS_SIZE = 440;
const CANVAS_CENTER = CANVAS_SIZE / 2;
const ORBIT_RING_RADIUS = 100;
const NODE_RADIUS = 184;
const FAR_ORBIT_BOOST = { small: 12, medium: 10, dense: 16 };
const MAX_ORBIT_AGENTS = 8;
const SliceHub = ({ slices, events, onSelectSlice, onOpenAssignment }) => {
    const orderedSlices = useMemo(() => {
        if (slices.length === 0) {
            return [];
        }
        return slices.slice().sort((a, b) => b.active - a.active || b.total - a.total);
    }, [slices]);
    const reroutedTasks = useMemo(() => deriveReroutedTaskIds(events), [events]);
    if (orderedSlices.length === 0) {
        return (_jsx("section", { className: "slice-hub slice-hub--empty", children: _jsx("p", { children: "No slices yet. Once telemetry syncs, active missions will appear here." }) }));
    }
    return (_jsx("section", { className: "slice-hub", children: _jsx("div", { className: "slice-hub__grid", children: orderedSlices.map((slice) => (_jsx(SliceOrbit, { slice: slice, reroutedTasks: reroutedTasks, onSelectSlice: onSelectSlice, onOpenAssignment: onOpenAssignment }, slice.id))) }) }));
};
const SliceOrbit = ({ slice, reroutedTasks, onSelectSlice, onOpenAssignment }) => {
    const progress = slice.total === 0 ? 0 : Math.min(100, Math.round((slice.completed / slice.total) * 100));
    const orbitAssignments = useMemo(() => buildOrbitAssignments(slice), [slice]);
    const orbitPositions = useMemo(() => {
        const withAgents = orbitAssignments.filter((assignment) => assignment.agent);
        if (withAgents.length === 0) {
            return [];
        }
        const total = withAgents.length;
        const boost = total >= 7 ? FAR_ORBIT_BOOST.dense : total >= 5 ? FAR_ORBIT_BOOST.medium : total <= 3 ? FAR_ORBIT_BOOST.small : 0;
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
    return (_jsx("article", { className: "slice-orbit-card", children: _jsx("div", { className: "slice-orbit-card__body", children: _jsxs("div", { className: "slice-orbit", style: { "--slice-accent": accent, "--slice-progress": `${progress}%` }, children: [_jsx("svg", { className: "slice-orbit__connections", viewBox: `0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`, "aria-hidden": "true", children: orbitPositions.map(({ assignment, x, y, startX, startY }) => {
                            const locationKind = assignment.task.location?.kind ?? "internal";
                            const connectorKey = `${assignment.task.id}-${assignment.agent?.id ?? "connector"}`;
                            return (_jsx("line", { x1: startX, y1: startY, x2: x, y2: y, className: `slice-orbit__connector slice-orbit__connector--${locationKind}` }, connectorKey));
                        }) }), _jsx(OrbitCenter, { slice: slice, progress: progress, onClick: () => onSelectSlice(slice) }), orbitPositions.map((position) => (_jsx(OrbitNode, { position: position, reroutedTasks: reroutedTasks, onOpenAssignment: (assignment) => onOpenAssignment(assignment, slice) }, `${position.assignment.task.id}-${position.assignment.agent?.id ?? "node"}`)))] }) }) }));
};
function formatTokenCount(tokens) {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (tokens >= 10_000) {
        return `${Math.round(tokens / 1_000)}K`;
    }
    return tokens.toLocaleString();
}
const OrbitCenter = ({ slice, progress, onClick }) => {
    return (_jsxs("button", { type: "button", className: "slice-orbit__center", onClick: onClick, children: [_jsx("span", { className: "slice-orbit__progress", "aria-hidden": "true", children: _jsx("span", { style: { width: `${progress}%` } }) }), _jsx("span", { className: "slice-orbit__name", children: slice.name }), _jsxs("span", { className: "slice-orbit__value", children: [slice.completed, "/", slice.total] }), slice.tokens !== undefined && _jsxs("span", { className: "slice-orbit__tokens", children: [formatTokenCount(slice.tokens), " tokens"] }), slice.mergePending && slice.mergePending > 0 && (_jsxs("span", { className: "slice-orbit__merge-pending", title: "Merge pending", children: ["\u25B3 ", slice.mergePending, " merge pending"] }))] }));
};
const TASK_STATUS_LABELS = {
    pending: "Pending",
    in_progress: "In Progress",
    received: "Received",
    review: "Review",
    testing: "Testing",
    complete: "Complete",
    merged: "Merged",
    merge_pending: "Merge Pending",
    failed: "Failed",
};
const STATUS_ACCENT = {
    pending: "#94a3b8",
    in_progress: "#67e8f9",
    received: "#86efac",
    review: "#a78bfa",
    testing: "#facc15",
    complete: "#34d399",
    merge_pending: "#f0ad4b",
    merged: "#34d399",
    failed: "#f87171",
};
const OrbitNode = ({ position, reroutedTasks, onOpenAssignment }) => {
    const { assignment, x, y, angleRad } = position;
    const agent = assignment.agent;
    if (!agent) {
        return null;
    }
    const quadrant = Math.cos(angleRad) >= 0 ? "east" : "west";
    const vertical = Math.sin(angleRad) >= 0 ? "south" : "north";
    const rerouted = reroutedTasks.has(assignment.task.id);
    const statusLabel = formatTaskStatus(assignment.task.status);
    return (_jsxs("button", { type: "button", className: `slice-orbit__node slice-orbit__node--${quadrant} slice-orbit__node--${vertical}`, style: { left: `${x}px`, top: `${y}px` }, "aria-label": `${assignment.task.taskNumber ?? assignment.task.title} — ${statusLabel}${rerouted ? " (rerouted)" : ""}`, onClick: () => onOpenAssignment(assignment), children: [_jsxs("span", { className: "slice-orbit__core", children: [_jsx("span", { className: `slice-orbit__halo slice-orbit__halo--${agent.tier.toLowerCase()}` }), _jsx("img", { src: agent.icon || FALLBACK_ICON, alt: agent.name, className: "slice-orbit__avatar", loading: "lazy", decoding: "async", onError: (event) => (event.currentTarget.src = FALLBACK_ICON) }), _jsx("span", { className: `slice-orbit__badge slice-orbit__badge--${agent.tier.toLowerCase()}`, children: agent.tier })] }), _jsx("span", { className: "slice-orbit__status", style: { color: STATUS_ACCENT[assignment.task.status] ?? "#94a3b8" }, "aria-hidden": "true", children: TASK_STATUS_LABELS[assignment.task.status] ?? formatTaskStatus(assignment.task.status) }), _jsx("span", { className: "slice-orbit__task", children: assignment.task.taskNumber ?? assignment.task.title }), _jsx("span", { className: "slice-orbit__model", "aria-hidden": "true", children: agent.name }), assignment.isBlocking && _jsx("span", { className: "slice-orbit__alert", children: "!" })] }));
};
function buildOrbitAssignments(slice) {
    const activeAssignments = slice.assignments.filter((assignment) => ACTIVE_STATUSES.has(assignment.task.status) && assignment.agent);
    if (activeAssignments.length > 0) {
        return activeAssignments.slice(0, MAX_ORBIT_AGENTS);
    }
    const fallbackTask = slice.tasks[0] ?? {
        id: `${slice.id}-placeholder`,
        title: slice.name,
        status: "pending",
        confidence: 1,
        updatedAt: slice.assignments[0]?.task.updatedAt ?? new Date().toISOString(),
    };
    if (slice.agents.length === 0) {
        return [];
    }
    return slice.agents.slice(0, MAX_ORBIT_AGENTS).map((agent) => ({ task: fallbackTask, agent, isBlocking: false }));
}
export default SliceHub;
function deriveReroutedTaskIds(events) {
    const rerouted = new Set();
    events.forEach((event) => {
        const type = event.type.toLowerCase();
        if ((type.includes("route") || type.includes("retry")) && event.taskId) {
            rerouted.add(event.taskId);
        }
    });
    return rerouted;
}
function formatTaskStatus(status) {
    const label = TASK_STATUS_LABELS[status];
    if (label) {
        return label;
    }
    return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
