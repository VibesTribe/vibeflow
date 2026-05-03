import React, { useMemo, useState, useEffect, useCallback } from "react";

type AdminTab = "Logs" | "Agents" | "Tools" | "Skills" | "Models" | "Preview" | "Research" | "Settings";

const NAV_ITEMS: AdminTab[] = ["Logs", "Agents", "Tools", "Skills", "Models", "Preview", "Research", "Settings"];

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

// --- Add Model Form ---
interface AddModelFormData {
  model_id: string;
  name: string;
  provider: string;
  tier: "free" | "paid";
  role: "primary" | "backup" | "fallback";
  context_limit: number;
  capabilities: string;
  api_key_name: string;
  api_key_value: string;
  credit_info: string;
}

const DEFAULT_FORM: AddModelFormData = {
  model_id: "",
  name: "",
  provider: "openrouter",
  tier: "free",
  role: "backup",
  context_limit: 128000,
  capabilities: "code, reasoning",
  api_key_name: "",
  api_key_value: "",
  credit_info: "",
};

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8080"
  : "https://api.vibestribe.rocks";

const AdminControlCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("Logs");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [formData, setFormData] = useState<AddModelFormData>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const getAdminToken = useCallback(() => {
    return localStorage.getItem("governor_admin_token") || "";
  }, []);

  const fetchModels = useCallback(async () => {
    const token = getAdminToken();
    if (!token) return;
    setModelsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/admin/models`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setModels(Array.isArray(data) ? data : []);
      }
    } catch {
      // silently fail — models tab just shows empty
    } finally {
      setModelsLoading(false);
    }
  }, [getAdminToken]);

  useEffect(() => {
    if (activeTab === "Models") {
      fetchModels();
    }
  }, [activeTab, fetchModels]);

  const handleAddModel = async () => {
    const token = getAdminToken();
    if (!token) {
      setSubmitResult("Error: No admin token set. Ask agent to set one.");
      return;
    }
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const body: any = {
        action: "add",
        model_id: formData.model_id,
        name: formData.name || formData.model_id,
        provider: formData.provider,
        tier: formData.tier,
        role: formData.role,
        context_limit: formData.context_limit,
        capabilities: formData.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
        credit_info: formData.credit_info,
      };
      if (formData.api_key_value) {
        body.api_key_name = formData.api_key_name || formData.provider.toUpperCase() + "_API_KEY";
        body.api_key_value = formData.api_key_value;
      }

      const resp = await fetch(`${API_BASE}/api/admin/model`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (resp.ok) {
        setSubmitResult(`Done: ${data.message}`);
        setFormData({ ...DEFAULT_FORM });
        fetchModels();
        setTimeout(() => setShowAddModel(false), 1500);
      } else {
        setSubmitResult(`Error: ${data.error || "failed"}`);
      }
    } catch (e: any) {
      setSubmitResult(`Error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBenchModel = async (modelId: string) => {
    const token = getAdminToken();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/api/admin/model`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "bench", model_id: modelId, reason: "benched from admin panel" }),
      });
      fetchModels();
    } catch {
      // silent
    }
  };

  const heading = useMemo(() => {
    switch (activeTab) {
      case "Logs": return "System Logs";
      case "Agents": return "Internal Agents & Routing";
      case "Tools": return "Runtime Tools & Systems";
      case "Skills": return "Skills Registry";
      case "Models": return "Models Overview";
      case "Preview": return "Preview Branches";
      case "Research": return "Research Digest";
      case "Settings": return "System Settings";
      default: return "Vibeflow Control Center";
    }
  }, [activeTab]);

  const subheading = useMemo(() => {
    switch (activeTab) {
      case "Logs": return "Routing events, failovers, merges, and warnings.";
      case "Agents": return "Agent assignments, routing chains, and token usage.";
      case "Tools": return "Examples of Vibes runtime systems currently available.";
      case "Skills": return "Execution skills wired into Vibeflow.";
      case "Models": return "Active models with provider, cost, context, and status.";
      case "Preview": return "Live preview URLs and approval state.";
      case "Research": return "Daily/weekly updates from the Research Agent.";
      case "Settings": return "Backups, notifications, and API keys.";
      default: return "";
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
    <div>
      {modelsLoading && <div style={{ padding: "12px", color: "#8b949e" }}>Loading models...</div>}
      {!modelsLoading && models.length === 0 && (
        <div style={{ padding: "12px", color: "#8b949e" }}>
          No models loaded. {getAdminToken() ? "Check API connection." : "Set admin token to enable."}
        </div>
      )}
      <div className="admin-grid admin-grid--double">
        {models.map((model: any) => {
          const id = model.id || "unknown";
          const name = model.name || id;
          const provider = model.provider || model.config?.provider || "?";
          const status = model.status || "unknown";
          const tier = model.tier || "free";
          const context = model.context_limit ? `${Math.round(model.context_limit / 1000)}k` : "?";
          const credit = model.credit_info || "";
          const creditTotal = model.credit_total_usd || 0;
          const creditRemaining = model.credit_remaining_usd || 0;
          const creditThreshold = model.credit_alert_threshold || 0.8;
          const isActive = status === "active";
          const hasCredit = creditTotal > 0;
          const creditPct = hasCredit ? Math.round((creditRemaining / creditTotal) * 100) : 0;
          const creditColor = !hasCredit ? "#30363d" : creditPct > 50 ? "#3fb950" : creditPct > 20 ? "#d29922" : "#f85149";

          return (
            <div key={id} className="admin-panel__card admin-panel__card--deep">
              <div className="admin-panel__row">
                <h3 className="admin-panel__title" style={{ color: "#ffffff" }}>{name}</h3>
                <span className={`admin-status admin-status--${isActive ? "success" : "warn"}`}>
                  {status}
                </span>
              </div>
              <div className="admin-meta">
                <div>Provider: {provider}</div>
                <div>Context: {context}</div>
                <div>Tier: {tier}{credit ? ` (${credit})` : ""}</div>
              </div>
              {hasCredit && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ color: "#ffffff", fontSize: "12px" }}>Credit: ${creditRemaining.toFixed(2)} / ${creditTotal.toFixed(2)}</span>
                    <span style={{ color: creditColor, fontSize: "12px", fontWeight: 600 }}>{creditPct}%</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", background: "#21262d", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ width: `${creditPct}%`, height: "100%", background: creditColor, borderRadius: "3px", transition: "width 0.3s" }} />
                  </div>
                  {creditPct < (creditThreshold * 100) && (
                    <div style={{ color: "#d29922", fontSize: "11px", marginTop: "3px" }}>Below {(creditThreshold * 100).toFixed(0)}% threshold</div>
                  )}
                  <button className="admin-ghost-button" style={{ marginTop: "6px", fontSize: "11px", padding: "2px 8px" }}
                    onClick={async () => {
                      const amount = prompt(`Add credit to ${id} (USD):`);
                      if (amount && !isNaN(parseFloat(amount))) {
                        const token = getAdminToken();
                        if (!token) return;
                        try {
                          await fetch(`${API_BASE}/api/admin/model`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ action: "set_credit", model_id: id, credit_amount: parseFloat(amount) }),
                          });
                          fetchModels();
                        } catch { /* silent */ }
                      }
                    }}>
                    Add Credit
                  </button>
                </div>
              )}
              {isActive && !hasCredit && (
                <button className="admin-ghost-button" onClick={() => handleBenchModel(id)}>
                  Bench
                </button>
              )}
            </div>
          );
        })}
      </div>
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

  const renderAddModelForm = () => (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{
        background: "#161b22", border: "1px solid #30363d", borderRadius: 12,
        padding: 24, width: 480, maxWidth: "90vw", maxHeight: "90vh", overflow: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ color: "#ffffff", margin: 0 }}>Add Model</h2>
          <button onClick={() => { setShowAddModel(false); setSubmitResult(null); }}
            style={{ background: "none", border: "none", color: "#8b949e", fontSize: 20, cursor: "pointer" }}>
            &times;
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ color: "#c9d1d9", fontSize: 13 }}>
            Model ID *
            <input value={formData.model_id} onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
              placeholder="deepseek/deepseek-chat" style={inputStyle} />
          </label>
          <label style={{ color: "#c9d1d9", fontSize: 13 }}>
            Display Name
            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="DeepSeek V4" style={inputStyle} />
          </label>
          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ color: "#c9d1d9", fontSize: 13, flex: 1 }}>
              Provider
              <select value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                style={{ ...inputStyle, height: 36 }}>
                <option value="openrouter">OpenRouter</option>
                <option value="google">Google</option>
                <option value="groq">Groq</option>
                <option value="deepseek">DeepSeek</option>
                <option value="openai">OpenAI</option>
                <option value="nvidia">NVIDIA</option>
              </select>
            </label>
            <label style={{ color: "#c9d1d9", fontSize: 13, flex: 1 }}>
              Tier
              <select value={formData.tier} onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                style={{ ...inputStyle, height: 36 }}>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label style={{ color: "#c9d1d9", fontSize: 13, flex: 1 }}>
              Role
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                style={{ ...inputStyle, height: 36 }}>
                <option value="primary">Primary</option>
                <option value="backup">Backup</option>
                <option value="fallback">Fallback</option>
              </select>
            </label>
          </div>
          <label style={{ color: "#c9d1d9", fontSize: 13 }}>
            Context Limit
            <input type="number" value={formData.context_limit}
              onChange={(e) => setFormData({ ...formData, context_limit: parseInt(e.target.value) || 128000 })}
              style={inputStyle} />
          </label>
          <label style={{ color: "#c9d1d9", fontSize: 13 }}>
            API Key (leave empty for free models)
            <input value={formData.api_key_value} type="password"
              onChange={(e) => setFormData({ ...formData, api_key_value: e.target.value })}
              placeholder="sk-..." style={inputStyle} />
          </label>
          <label style={{ color: "#c9d1d9", fontSize: 13 }}>
            Credit Info
            <input value={formData.credit_info} onChange={(e) => setFormData({ ...formData, credit_info: e.target.value })}
              placeholder="$10 credit" style={inputStyle} />
          </label>
        </div>

        {submitResult && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: submitResult.startsWith("Error") ? "#3d1f1f" : "#1f3d1f", color: "#ffffff", fontSize: 14 }}>
            {submitResult}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={() => { setShowAddModel(false); setSubmitResult(null); }}
            style={cancelBtnStyle}>
            Cancel
          </button>
          <button onClick={handleAddModel} disabled={submitting || !formData.model_id}
            style={{ ...primaryBtnStyle, opacity: submitting || !formData.model_id ? 0.5 : 1 }}>
            {submitting ? "Adding..." : "Add Model"}
          </button>
        </div>
      </div>
    </div>
  );

  const renderActive = () => {
    switch (activeTab) {
      case "Logs": return renderLogs();
      case "Agents": return renderAgents();
      case "Tools": return renderTools();
      case "Skills": return renderSkills();
      case "Models": return renderModels();
      case "Preview": return renderPreview();
      case "Research": return renderResearch();
      case "Settings": return renderSettings();
      default: return null;
    }
  };

  return (
    <div className="admin-console">
      {showAddModel && renderAddModelForm()}
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
                <button type="button" onClick={() => { setShowAddModel(true); setMenuOpen(false); }}>Add Model</button>
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
      <div className="admin-hero">
        <span className="admin-hero__eyebrow">Mission Control · Vibeflow</span>
        <div className="admin-hero__headline">
          <h1>Control Center</h1>
          <span className="admin-hero__pill">{activeTab} view</span>
        </div>
        <p className="admin-hero__subhead">{subheading}</p>
      </div>
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

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 4, padding: "8px 12px",
  background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
  color: "#ffffff", fontSize: 14, boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "8px 20px", background: "#238636", border: "none", borderRadius: 6,
  color: "#ffffff", fontSize: 14, cursor: "pointer", fontWeight: 600,
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 20px", background: "transparent", border: "1px solid #30363d", borderRadius: 6,
  color: "#c9d1d9", fontSize: 14, cursor: "pointer",
};

export default AdminControlCenter;
