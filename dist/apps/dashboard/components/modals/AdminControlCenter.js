import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
const NAV_ITEMS = ["Logs", "Agents", "Tools", "Skills", "Models", "Preview", "Research", "Settings"];
const LOG_ENTRIES = [
    "[11:14:02] Orchestrator: Routed Planner task -> DeepSeek-R1",
    "[11:14:08] Codex MCP: Patch applied to preview/T1.3",
    "[11:16:22] Visual Tester: Layout discrepancy detected",
    "[11:19:10] Supervisor: Changes approved",
];
const PREVIEW_LINKS = [
    { label: "preview/T1.3-dashboard-header", url: "https://vibestribe.github.io/vibeflow/preview/T1.3" },
    { label: "preview/S2.1-modelview", url: "https://vibestribe.github.io/vibeflow/preview/S2.1" },
];
const RESEARCH_ITEMS = ["Claude MCP2 update summary", "DeepSeek cost optimization note", "Browser-Use 0.23 stability improvements"];
const SETTINGS_ITEMS = ["Snapshots: Auto-backup enabled", "Notifications: Email + Dashboard", "API Keys: 3 active (hidden)"];
const SKILLS = ["dag_executor", "cli_exec", "visual_exec", "test_runner"];
const TOOLING = [
    { name: "GraphBit", status: "Healthy", tone: "success", version: "0.9.2", updated: "2 days ago" },
    { name: "Browser-Use", status: "Warning", tone: "warn", version: "0.22", updated: "4 hours ago" },
    { name: "Codex MCP", status: "Connected", tone: "info", version: "1.4.0", updated: "Just now" },
    { name: "Playwright", status: "Stable", tone: "success", version: "1.43.0", updated: "Yesterday" },
];
const MODELS = [
    { name: "DeepSeek-R1", provider: "OpenRouter", context: "200k (180k effective)", success: "94%", cost: "$" },
    { name: "Gemini Flash", provider: "Google", context: "1M (900k effective)", success: "91%", cost: "$" },
    { name: "GPT-5.1-mini", provider: "OpenAI", context: "128k (115k effective)", success: "92%", cost: "$$" },
];
const AGENTS = [
    {
        name: "Planner Agent",
        model: "DeepSeek-R1 ($)",
        creativity: "Low",
        tokens: "2437",
        routing: "Planner -> DeepSeek-R1 -> Gemini Flash (fallback)",
    },
    {
        name: "Supervisor Agent",
        model: "GPT-4o-mini ($$)",
        creativity: "Balanced",
        tokens: "1280",
        routing: "Supervisor -> GPT-4o-mini -> Claude (validation)",
    },
];
const AdminControlCenter = () => {
    const [activeTab, setActiveTab] = useState("Logs");
    const [menuOpen, setMenuOpen] = useState(false);
    const heading = useMemo(() => {
        switch (activeTab) {
            case "Logs":
                return "System Logs";
            case "Agents":
                return "Internal Agents & Routing";
            case "Tools":
                return "Runtime Tools & Systems";
            case "Skills":
                return "Skills Registry";
            case "Models":
                return "Models Overview";
            case "Preview":
                return "Preview Branches";
            case "Research":
                return "Research Digest";
            case "Settings":
                return "System Settings";
            default:
                return "Vibeflow Control Center";
        }
    }, [activeTab]);
    const subheading = useMemo(() => {
        switch (activeTab) {
            case "Logs":
                return "Routing events, failovers, merges, and warnings.";
            case "Agents":
                return "Agent assignments, routing chains, and token usage.";
            case "Tools":
                return "Examples of Vibes runtime systems currently available.";
            case "Skills":
                return "Execution skills wired into Vibeflow.";
            case "Models":
                return "Example models with provider, cost, context, and success rate.";
            case "Preview":
                return "Live preview URLs and approval state.";
            case "Research":
                return "Daily/weekly updates from the Research Agent.";
            case "Settings":
                return "Backups, notifications, and API keys.";
            default:
                return "";
        }
    }, [activeTab]);
    const renderLogs = () => (_jsx("div", { className: "admin-panel__card admin-panel__card--stacked", children: _jsx("ul", { className: "admin-list", children: LOG_ENTRIES.map((entry) => (_jsx("li", { children: entry }, entry))) }) }));
    const renderAgents = () => (_jsx("div", { className: "admin-grid admin-grid--double", children: AGENTS.map((agent) => (_jsxs("div", { className: "admin-panel__card admin-panel__card--deep", children: [_jsxs("div", { className: "admin-panel__row", children: [_jsx("h3", { className: "admin-panel__title", children: agent.name }), _jsx("button", { className: "admin-ghost-button", children: "View Prompt" })] }), _jsxs("div", { className: "admin-meta", children: [_jsxs("div", { children: ["Model: ", agent.model] }), _jsxs("div", { children: ["Creativity: ", agent.creativity] }), _jsxs("div", { children: ["Tokens today: ", agent.tokens] })] }), _jsxs("div", { className: "admin-pill admin-pill--route", children: ["Routing: ", agent.routing] })] }, agent.name))) }));
    const renderTools = () => (_jsx("div", { className: "admin-grid admin-grid--double", children: TOOLING.map((tool) => (_jsxs("div", { className: "admin-panel__card admin-panel__card--deep", children: [_jsxs("div", { className: "admin-panel__row", children: [_jsx("h3", { className: "admin-panel__title", children: tool.name }), _jsx("span", { className: `admin-status admin-status--${tool.tone}`, children: tool.status })] }), _jsxs("div", { className: "admin-meta", children: [_jsxs("div", { children: ["Version: ", tool.version] }), _jsxs("div", { children: ["Updated: ", tool.updated] })] }), _jsx("button", { className: "admin-ghost-button", children: "Details" })] }, tool.name))) }));
    const renderSkills = () => (_jsx("div", { className: "admin-panel__card admin-panel__card--stacked", children: _jsx("ul", { className: "admin-list", children: SKILLS.map((skill) => (_jsx("li", { children: skill }, skill))) }) }));
    const renderModels = () => (_jsx("div", { className: "admin-grid admin-grid--double", children: MODELS.map((model) => (_jsxs("div", { className: "admin-panel__card admin-panel__card--deep", children: [_jsxs("div", { className: "admin-panel__row", children: [_jsx("h3", { className: "admin-panel__title", children: model.name }), _jsx("span", { className: "admin-cost", children: model.cost })] }), _jsxs("div", { className: "admin-meta", children: [_jsxs("div", { children: ["Provider: ", model.provider] }), _jsxs("div", { children: ["Context: ", model.context] }), _jsxs("div", { children: ["Success: ", model.success] })] }), _jsx("button", { className: "admin-ghost-button", children: "View Details" })] }, model.name))) }));
    const renderPreview = () => (_jsx("div", { className: "admin-panel__card admin-panel__card--stacked", children: _jsx("ul", { className: "admin-list", children: PREVIEW_LINKS.map((entry) => (_jsxs("li", { children: [entry.label, " \u2014", " ", _jsx("a", { href: entry.url, target: "_blank", rel: "noreferrer", className: "admin-link", children: entry.url })] }, entry.label))) }) }));
    const renderResearch = () => (_jsx("div", { className: "admin-panel__card admin-panel__card--stacked", children: _jsx("ul", { className: "admin-list", children: RESEARCH_ITEMS.map((item) => (_jsx("li", { children: item }, item))) }) }));
    const renderSettings = () => (_jsx("div", { className: "admin-panel__card admin-panel__card--stacked", children: _jsx("ul", { className: "admin-list", children: SETTINGS_ITEMS.map((item) => (_jsx("li", { children: item }, item))) }) }));
    const renderActive = () => {
        switch (activeTab) {
            case "Logs":
                return renderLogs();
            case "Agents":
                return renderAgents();
            case "Tools":
                return renderTools();
            case "Skills":
                return renderSkills();
            case "Models":
                return renderModels();
            case "Preview":
                return renderPreview();
            case "Research":
                return renderResearch();
            case "Settings":
                return renderSettings();
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: "admin-console", children: [_jsxs("header", { className: "admin-console__bar", children: [_jsx("div", { className: "admin-console__title", children: "Vibeflow Control Center" }), _jsx("nav", { className: "admin-console__nav", "aria-label": "Admin navigation", children: NAV_ITEMS.map((item) => (_jsx("button", { className: `admin-nav__item ${activeTab === item ? "admin-nav__item--active" : ""}`, onClick: () => setActiveTab(item), type: "button", children: item }, item))) }), _jsxs("div", { className: "admin-console__actions", children: [_jsxs("div", { className: "admin-new", children: [_jsx("button", { type: "button", className: "admin-primary", onClick: () => setMenuOpen((open) => !open), children: "+ New" }), menuOpen && (_jsxs("div", { className: "admin-new__menu", children: [_jsx("button", { type: "button", children: "Add Model" }), _jsx("button", { type: "button", children: "Add Agent" }), _jsx("button", { type: "button", children: "Add Skill" }), _jsx("button", { type: "button", children: "Add Tool" })] }))] }), _jsxs("button", { type: "button", className: "admin-ghost-button admin-ghost-button--icon", children: ["\uD83D\uDD0D", " Search"] }), _jsxs("button", { type: "button", className: "admin-ghost-button admin-ghost-button--icon", children: ["\uD83E\uDDCD", " User"] })] })] }), _jsxs("div", { className: "admin-hero", children: [_jsx("span", { className: "admin-hero__eyebrow", children: "Mission Control \u00B7 Vibeflow" }), _jsxs("div", { className: "admin-hero__headline", children: [_jsx("h1", { children: "Control Center" }), _jsxs("span", { className: "admin-hero__pill", children: [activeTab, " view"] })] }), _jsx("p", { className: "admin-hero__subhead", children: subheading })] }), _jsxs("section", { className: "admin-panel", children: [_jsxs("div", { className: "admin-panel__header", children: [_jsx("h2", { children: heading }), _jsx("p", { children: subheading })] }), renderActive()] })] }));
};
export default AdminControlCenter;
