import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const SliceDockPanel = ({ slices, loading, onViewDocs, onViewLogs, onSelectSlice }) => {
    return (_jsxs("aside", { className: "rail rail--left", "aria-label": "Slice dock", children: [_jsxs("div", { className: "rail__header", children: [_jsx("button", { type: "button", onClick: onViewLogs, className: "rail__button rail__button--ghost", children: "Logs" }), _jsx("button", { type: "button", onClick: onViewDocs, className: "rail__button rail__button--ghost", children: "Docs" }), _jsx("span", { className: "rail__title", children: "Slice Dock" })] }), _jsxs("div", { className: "rail__scroll", children: [loading && slices.length === 0 && _jsx("p", { className: "rail__empty", children: "Syncing telemetry..." }), slices.map((slice) => {
                        const completion = slice.total === 0 ? 0 : Math.round((slice.completed / slice.total) * 100);
                        const accent = slice.total > 0 && slice.completed >= slice.total ? "#22c55e" : slice.accent;
                        return (_jsxs("button", { type: "button", onClick: () => onSelectSlice(slice), className: "slice-dial", "aria-label": `Open ${slice.name}`, children: [_jsx("span", { className: "slice-dial__ring", style: { background: `conic-gradient(${accent} ${completion}%, rgba(12, 23, 42, 0.85) 0)` }, children: _jsxs("span", { className: "slice-dial__inner", children: [_jsxs("span", { className: "slice-dial__percent", children: [completion, "%"] }), _jsxs("span", { className: "slice-dial__tasks", children: [slice.completed, "/", slice.total] })] }) }), _jsx("span", { className: "slice-dial__label", children: slice.name }), _jsxs("span", { className: "slice-dial__meta", children: [slice.active, " active ", "\u00B7", " ", slice.blocked, " blocked"] }), slice.tokens !== undefined && _jsxs("span", { className: "slice-dial__tokens", children: [formatTokenCount(slice.tokens), " TOKENS"] })] }, slice.id));
                    }), slices.length === 0 && !loading && _jsx("p", { className: "rail__empty", children: "No slices yet." })] })] }));
};
export default SliceDockPanel;
function formatTokenCount(tokens) {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
    }
    if (tokens >= 10_000) {
        return `${Math.round(tokens / 1_000)}K`;
    }
    return tokens.toLocaleString();
}
