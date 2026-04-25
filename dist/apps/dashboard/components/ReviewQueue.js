import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const STATUS_META = {
    pending: { label: "Pending", tone: "pending" },
    changes_requested: { label: "Changes requested", tone: "changes" },
    approved: { label: "Approved", tone: "approved" },
    restored: { label: "Restored", tone: "restored" },
};
const ReviewQueue = ({ items, loading, onSelect, onShowAgents, onRefresh, activeTaskId, layout = "sidebar", }) => {
    const Container = layout === "sidebar" ? "aside" : "section";
    const containerClass = layout === "sidebar" ? "rail rail--right review-queue review-queue--rail" : "review-queue review-queue--plain";
    return (_jsxs(Container, { className: containerClass, "aria-label": "Review queue", children: [_jsxs("div", { className: "rail__header", children: [_jsxs("div", { className: "rail__tabs", role: "tablist", "aria-label": "Sidebar tabs", children: [_jsx("button", { type: "button", className: "rail__tab", role: "tab", "aria-selected": "false", onClick: onShowAgents, children: "Agents" }), _jsxs("button", { type: "button", className: "rail__tab rail__tab--active", role: "tab", "aria-selected": "true", children: ["\uD83E\uDDFE Review Queue", items.length > 0 && _jsx("span", { className: "rail__tab-badge", children: items.length })] })] }), _jsx("button", { type: "button", onClick: onRefresh, className: "rail__button rail__button--ghost", children: "Refresh" }), _jsx("span", { className: "rail__title", children: "Review Queue" })] }), _jsxs("div", { className: "rail__scroll review-queue__list", children: [loading && items.length === 0 && _jsx("p", { className: "rail__empty", children: "Loading review queue\u2026" }), !loading && items.length === 0 && _jsx("p", { className: "rail__empty", children: "No flagged tasks waiting on review." }), items.map((item) => {
                        const status = STATUS_META[item.status] ?? STATUS_META.pending;
                        const isActive = item.taskId === activeTaskId;
                        return (_jsxs("button", { type: "button", className: `review-queue__item ${isActive ? "review-queue__item--active" : ""}`, onClick: () => onSelect(item), children: [_jsxs("div", { className: "review-queue__item-header", children: [_jsx("span", { className: `review-queue__pill review-queue__pill--${status.tone}`, children: status.label }), item.updatedAt && _jsx("span", { className: "review-queue__timestamp", children: new Date(item.updatedAt).toLocaleString() })] }), _jsx("span", { className: "review-queue__title", children: item.taskNumber ? `${item.taskNumber} — ${item.title}` : item.title }), _jsx("p", { className: "review-queue__summary", children: item.summary ?? "No summary available for this task yet." }), _jsxs("div", { className: "review-queue__meta", children: [item.owner && _jsxs("span", { children: ["Owner: ", item.owner] }), item.sliceName && _jsxs("span", { children: ["Slice: ", item.sliceName] })] }), item.notes && _jsxs("p", { className: "review-queue__notes", children: ["\u201C", item.notes, "\u201D"] })] }, item.taskId));
                    })] })] }));
};
export default ReviewQueue;
