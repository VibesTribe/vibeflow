import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const AgentHangar = ({ agents, selectedAgentId, onSelectAgent, isLoading }) => {
    return (_jsxs("section", { className: "agent-hangar", children: [_jsxs("header", { children: [_jsx("h2", { children: "Agent Hangar" }), _jsx("div", { className: "agent-hangar__legend", children: isLoading ? _jsx("span", { className: "agent-hangar__badge", children: "Syncing" }) : _jsxs("span", { children: [agents.length, " online"] }) })] }), isLoading && agents.length === 0 ? (_jsx("p", { className: "agent-hangar__empty", children: "Loading telemetry..." })) : agents.length === 0 ? (_jsx("p", { className: "agent-hangar__empty", children: "Agents will appear here once missions run." })) : (_jsx("ul", { children: agents.map((agent) => {
                    const isSelected = agent.id === selectedAgentId;
                    const statusClass = `agent-hangar__status agent-hangar__status--${agent.status}`;
                    return (_jsx("li", { className: isSelected ? "agent-hangar__item agent-hangar__item--selected" : "agent-hangar__item", children: _jsxs("button", { type: "button", onClick: () => onSelectAgent?.(agent), children: [_jsx("span", { className: "agent-hangar__name", children: agent.name }), _jsx("span", { className: statusClass, children: agent.status }), _jsx("span", { className: "agent-hangar__summary", children: agent.summary })] }) }, agent.id));
                }) }))] }));
};
export default AgentHangar;
