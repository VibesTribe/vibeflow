import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const AgentView = ({ agents }) => {
    if (agents.length === 0) {
        return _jsx("div", { children: "No agents reporting status." });
    }
    return (_jsx("div", { className: "feed-list", children: agents.map((agent) => (_jsxs("div", { className: "feed-item", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 4 }, children: [_jsx("strong", { children: agent.name }), _jsx("span", { className: "status-chip", children: agent.status })] }), _jsx("div", { style: { fontSize: "0.8rem", opacity: 0.75 }, children: agent.summary }), _jsxs("div", { style: { marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }, children: ["Last heartbeat: ", new Date(agent.updatedAt).toLocaleTimeString()] })] }, agent.id))) }));
};
export default AgentView;
