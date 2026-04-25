import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const QUALITY_LABELS = {
    pass: "Supervisor pass",
    fail: "Needs repair",
    pending: "In review",
};
const TaskCard = ({ task, qualityStatus = "pending" }) => {
    const qualityClass = `task-card__quality task-card__quality--${qualityStatus}`;
    return (_jsxs("article", { className: "task-card", children: [_jsxs("header", { className: "task-card__header", children: [_jsx("strong", { children: task.title }), _jsx("span", { className: "status-chip", children: task.status })] }), _jsxs("div", { className: "task-card__meta", children: [_jsx("span", { className: "task-card__owner", children: task.owner ?? "Unassigned" }), _jsxs("span", { className: "task-card__confidence", children: [Math.round(task.confidence * 100), "% conf"] })] }), _jsxs("footer", { className: "task-card__footer", children: [_jsxs("span", { className: "task-card__updated", children: ["Updated ", new Date(task.updatedAt).toLocaleTimeString()] }), _jsx("span", { className: qualityClass, children: QUALITY_LABELS[qualityStatus] })] })] }));
};
export default TaskCard;
