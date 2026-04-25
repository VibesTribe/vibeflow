import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { FALLBACK_ICON } from "../utils/icons";
const STATUS_META = {
    ready: { label: "Ready", icon: "\u2713" },
    active: { label: "Active", icon: "\u21BB" },
    cooldown: { label: "Cooldown", icon: "\u23F2" },
    credit: { label: "Credit Needed", icon: "\u{1F4B0}" },
    issue: { label: "Issue", icon: "\u26A0" },
};
const AgentHangarPanel = ({ agents, loading, onViewAll, onAdd, onSelectAgent }) => {
    const orderedAgents = useMemo(() => agents.slice().sort((a, b) => a.name.localeCompare(b.name)), [agents]);
    return (_jsxs("aside", { className: "rail rail--right", "aria-label": "Agent hangar", children: [_jsxs("div", { className: "rail__header", children: [_jsx("button", { type: "button", onClick: onViewAll, className: "rail__button rail__button--ghost", children: "Models" }), _jsx("button", { type: "button", onClick: onAdd, className: "rail__button rail__button--ghost", children: "Add" }), _jsx("span", { className: "rail__title", children: "Agent Hangar" })] }), _jsxs("div", { className: "rail__scroll", children: [loading && orderedAgents.length === 0 && _jsx("p", { className: "rail__empty", children: "Syncing agents..." }), orderedAgents.map((agent) => {
                        const tone = normalizeStatus(agent.status);
                        const indicator = STATUS_META[tone] ?? STATUS_META.ready;
                        return (_jsxs("button", { type: "button", className: `agent-chip agent-chip--${tone}`, "aria-label": `${agent.name} · ${indicator.label}`, onClick: () => onSelectAgent(agent), children: [_jsxs("div", { className: "agent-chip__logo", children: [_jsx("img", { src: agent.icon || FALLBACK_ICON, alt: agent.name, className: "agent-chip__avatar", loading: "lazy", decoding: "async", onError: (event) => (event.currentTarget.src = FALLBACK_ICON) }), _jsx("span", { className: `agent-chip__status agent-chip__status--${tone}`, "aria-hidden": "true", children: indicator.icon }), _jsx("span", { className: `agent-chip__tier agent-chip__tier--${agent.tier.toLowerCase()}`, children: agent.tier })] }), _jsx("span", { className: "agent-chip__name", title: agent.name, children: agent.name })] }, agent.id));
                    }), !loading && orderedAgents.length === 0 && _jsx("p", { className: "rail__empty", children: "No agents registered yet." })] })] }));
};
function normalizeStatus(status) {
    const lower = status.toLowerCase();
    if (lower.includes("credit"))
        return "credit";
    if (lower.includes("cooldown") || lower.includes("timeout"))
        return "cooldown";
    if (lower.includes("issue") || lower.includes("blocked") || lower.includes("error"))
        return "issue";
    if (lower.includes("working") || lower.includes("progress") || lower.includes("running"))
        return "active";
    return "ready";
}
export default AgentHangarPanel;
