import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const statusClassName = (status) => {
    switch (status) {
        case 'completed':
            return 'model-analytics__status model-analytics__status--completed';
        case 'failed':
            return 'model-analytics__status model-analytics__status--failed';
        case 'pending':
        default:
            return 'model-analytics__status model-analytics__status--pending';
    }
};
const ModelAnalyticsView = ({ runs, updatedAt, loading }) => {
    return (_jsxs("section", { className: "model-analytics", children: [_jsxs("header", { className: "model-analytics__header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Model Analytics" }), _jsxs("p", { className: "model-analytics__meta", children: ["Metrics updated ", new Date(updatedAt).toLocaleString()] })] }), loading && _jsx("span", { className: "model-analytics__badge", children: "Syncing\u2026" })] }), runs.length === 0 ? (_jsx("p", { className: "model-analytics__empty", children: "Waiting for the first run to complete." })) : (_jsxs("table", { className: "model-analytics__table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Run" }), _jsx("th", { children: "Started" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Notes" })] }) }), _jsx("tbody", { children: runs.slice(0, 6).map((run) => (_jsxs("tr", { children: [_jsx("td", { children: run.id }), _jsx("td", { children: new Date(run.started_at).toLocaleString() }), _jsx("td", { children: _jsx("span", { className: statusClassName(run.status), children: run.status }) }), _jsx("td", { children: run.notes ?? '—' })] }, run.id))) })] }))] }));
};
export default ModelAnalyticsView;
