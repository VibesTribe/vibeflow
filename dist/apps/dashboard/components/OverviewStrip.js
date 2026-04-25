import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const OverviewStrip = ({ metrics, updatedAt, isLoading }) => {
    const entries = Object.entries(metrics);
    return (_jsxs("div", { className: "metric-grid", children: [isLoading && entries.length === 0 ? (_jsx("div", { children: "Loading latest mission state\u2026" })) : (entries.map(([label, value]) => (_jsxs("div", { className: "metric", children: [_jsx("span", { className: "metric-label", children: label.replace(/_/g, " ") }), _jsx("span", { className: "metric-value", children: value.toFixed(2) })] }, label)))), _jsxs("div", { className: "metric", children: [_jsx("span", { className: "metric-label", children: "Last Sync" }), _jsx("span", { className: "metric-value", children: new Date(updatedAt).toLocaleTimeString() })] })] }));
};
export default OverviewStrip;
