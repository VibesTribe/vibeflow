import React, { useMemo, useState } from "react";

type AdminTab = "Logs" | "Agents" | "Tools" | "Skills" | "Models" | "Preview" | "Research" | "Settings";

const NAV_ITEMS: AdminTab[] = ["Logs", "Agents", "Tools", "Skills", "Models", "Preview", "Research", "Settings"];

const LOG_ENTRIES = [
  "[11:14:02] Orchestrator: Routed Planner task → DeepSeek-R1",
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
    routing: "Planner → DeepSeek-R1 → Gemini Flash (fallback)",
  },
  {
    name: "Supervisor Agent",
    model: "GPT-4o-mini ($$)",
    creativity: "Balanced",
    tokens: "1280",
    routing: "Supervisor → GPT-4o-mini → Claude (validation)",
  },
];

const AdminControlCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("Logs");
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

  const renderLogs = () => (
    <div className="admin-panel__card admin-panel__card--stacked">
      <ul className="admin-list">
        {LOG_ENTRIES.map((entry) => (
          <li key={entry}>{entry}</li>
        ))}
      </ul>
    </div>
  );

  const renderAgents = () => (
    <div className="admin-grid admin-grid--double">
      {AGENTS.map((agent) => (
        <div key={agent.name} className="admin-panel__card admin-panel__card--deep">
          <div className="admin-panel__row">
            <h3 className="admin-panel__title">{agent.name}</h3>
            <button className="admin-ghost-button">View Prompt</button>
          </div>
          <div className="admin-meta">
            <div>Model: {agent.model}</div>
            <div>Creativity: {agent.creativity}</div>
            <div>Tokens today: {agent.tokens}</div>
          </div>
          <div className="admin-pill admin-pill--route">Routing: {agent.routing}</div>
        </div>
      ))}
    </div>
  );

  const renderTools = () => (
    <div className="admin-grid admin-grid--double">
      {TOOLING.map((tool) => (
        <div key={tool.name} className="admin-panel__card admin-panel__card--deep">
          <div className="admin-panel__row">
            <h3 className="admin-panel__title">{tool.name}</h3>
            <span className={`admin-status admin-status--${tool.tone}`}>{tool.status}</span>
          </div>
          <div className="admin-meta">
            <div>Version: {tool.version}</div>
            <div>Updated: {tool.updated}</div>
          </div>
          <button className="admin-ghost-button">Details</button>
        </div>
      ))}
    </div>
  );

  const renderSkills = () => (
    <div className="admin-panel__card admin-panel__card--stacked">
      <ul className="admin-list">
        {SKILLS.map((skill) => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </div>
  );

  const renderModels = () => (
    <div className="admin-grid admin-grid--double">
      {MODELS.map((model) => (
        <div key={model.name} className="admin-panel__card admin-panel__card--deep">
          <div className="admin-panel__row">
            <h3 className="admin-panel__title">{model.name}</h3>
            <span className="admin-cost">{model.cost}</span>
          </div>
          <div className="admin-meta">
            <div>Provider: {model.provider}</div>
            <div>Context: {model.context}</div>
            <div>Success: {model.success}</div>
          </div>
          <button className="admin-ghost-button">View Details</button>
        </div>
      ))}
    </div>
  );

  const renderPreview = () => (
    <div className="admin-panel__card admin-panel__card--stacked">
      <ul className="admin-list">
        {PREVIEW_LINKS.map((entry) => (
          <li key={entry.label}>
            {entry.label} —{" "}
            <a href={entry.url} target="_blank" rel="noreferrer" className="admin-link">
              {entry.url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );

  const renderResearch = () => (
    <div className="admin-panel__card admin-panel__card--stacked">
      <ul className="admin-list">
        {RESEARCH_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );

  const renderSettings = () => (
    <div className="admin-panel__card admin-panel__card--stacked">
      <ul className="admin-list">
        {SETTINGS_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );

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

  return (
    <div className="admin-console">
      <header className="admin-console__bar">
        <div className="admin-console__title">Vibeflow Control Center</div>
        <nav className="admin-console__nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={`admin-nav__item ${activeTab === item ? "admin-nav__item--active" : ""}`}
              onClick={() => setActiveTab(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="admin-console__actions">
          <div className="admin-new">
            <button type="button" className="admin-primary" onClick={() => setMenuOpen((open) => !open)}>
              + New
            </button>
            {menuOpen && (
              <div className="admin-new__menu">
                <button type="button">Add Model</button>
                <button type="button">Add Agent</button>
                <button type="button">Add Skill</button>
                <button type="button">Add Tool</button>
              </div>
            )}
          </div>
          <button type="button" className="admin-ghost-button admin-ghost-button--icon">
            {"\uD83D\uDD0D"} Search
          </button>
          <button type="button" className="admin-ghost-button admin-ghost-button--icon">
            {"\uD83E\uDDCD"} User
          </button>
        </div>
      </header>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h2>{heading}</h2>
          <p>{subheading}</p>
        </div>
        {renderActive()}
      </section>
    </div>
  );
};

export default AdminControlCenter;
