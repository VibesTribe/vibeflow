import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATUS_LABELS = {
    assigned: 'Assigned',
    in_progress: 'In Progress',
    received: 'Received',
    review: 'Review',
    testing: 'Testing',
    human_review: 'Human Review',
    complete: 'Complete',
    merged: 'Merged',
    merge_pending: 'Merge Pending',
    blocked: 'Blocked',
};
function summariseTasks(tasks) {
    return tasks.reduce((acc, task) => {
        const key = task.status ?? 'unknown';
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
}
const SliceDock = ({ tasks, failures, metrics, updatedAt, isLoading, onSelectTask }) => {
    const summary = summariseTasks(tasks);
    const statuses = Object.keys(STATUS_LABELS);
    return (_jsxs("div", { className: "slice-dock", children: [_jsxs("header", { className: "slice-dock__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Mission Slices" }), _jsxs("p", { className: "slice-dock__meta", children: ["Updated ", new Date(updatedAt).toLocaleString()] })] }), isLoading && _jsx("span", { className: "slice-dock__badge", children: "Syncing\u2026" })] }), _jsx("div", { className: "slice-dock__grid", children: statuses.map((status) => {
                    const count = summary[status] ?? 0;
                    return (_jsxs("div", { className: `slice-dock__card slice-dock__card--${status}`, children: [_jsx("span", { className: "slice-dock__count", children: count }), _jsx("span", { className: "slice-dock__label", children: STATUS_LABELS[status] })] }, status));
                }) }), _jsxs("section", { className: "slice-dock__list", children: [_jsx("h3", { children: "Active Tasks" }), tasks.length === 0 ? (_jsx("p", { className: "slice-dock__empty", children: "No tasks yet \u2014 telemetry seeded for bootstrap." })) : (_jsx("ul", { children: tasks.map((task) => (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => onSelectTask?.(task), children: [_jsx("span", { className: "slice-dock__task-title", children: task.title }), _jsx("span", { className: `slice-dock__status slice-dock__status--${task.status}`, children: STATUS_LABELS[task.status ?? 'assigned'] ?? task.status })] }) }, task.id))) }))] }), _jsxs("section", { className: "slice-dock__metrics", children: [_jsx("h3", { children: "Key Metrics" }), Object.keys(metrics).length === 0 ? (_jsx("p", { className: "slice-dock__empty", children: "Metrics will populate once agents start running." })) : (_jsx("div", { className: "slice-dock__metric-grid", children: Object.entries(metrics).map(([key, value]) => (_jsxs("div", { className: "slice-dock__metric", children: [_jsx("span", { className: "slice-dock__metric-label", children: key.replace(/_/g, ' ') }), _jsx("span", { className: "slice-dock__metric-value", children: value })] }, key))) }))] }), _jsxs("section", { className: "slice-dock__failures", children: [_jsx("h3", { children: "Recent Failures" }), failures.length === 0 ? (_jsx("p", { className: "slice-dock__empty", children: "No failures logged \u2014 good news!" })) : (_jsx("ul", { children: failures.map((failure) => (_jsxs("li", { children: [_jsx("strong", { children: failure.title }), _jsx("p", { children: failure.summary }), _jsx("span", { className: "slice-dock__reason", children: failure.reasonCode })] }, failure.id))) }))] })] }));
};
export default SliceDock;
