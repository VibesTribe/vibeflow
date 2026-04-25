import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import TaskCard from "./TaskCard";
const order = [
    "pending",
    "in_progress",
    "received",
    "review",
    "testing",
    "complete",
    "merge_pending",
    "merged",
    "failed",
];
const Timeline = ({ tasks, isLoading, qualityByTask }) => {
    if (isLoading && tasks.length === 0) {
        return _jsx("div", { children: "Loading task timeline." });
    }
    const grouped = tasks.reduce((acc, task) => {
        acc[task.status] = acc[task.status] ?? [];
        acc[task.status].push(task);
        return acc;
    }, {});
    return (_jsx("div", { className: "timeline-grid", children: order.map((status) => (_jsxs("section", { children: [_jsx("h3", { style: { textTransform: "uppercase", fontSize: "0.8rem", opacity: 0.7 }, children: status.replace(/_/g, " ") }), _jsxs("div", { style: { display: "grid", gap: 8 }, children: [(grouped[status] ?? []).map((task) => (_jsx(TaskCard, { task: task, qualityStatus: qualityByTask[task.id] ?? "pending" }, task.id))), (grouped[status] ?? []).length === 0 && _jsx("div", { style: { opacity: 0.5 }, children: "No tasks" })] })] }, status))) }));
};
export default Timeline;
