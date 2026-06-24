import React, { useMemo, useState, useEffect, useCallback } from "react";
import VqaPanel from "../VqaPanel";
import DesignHub from "../DesignHub";

type AdminTab = "System" | "Design" | "Add";

const NAV_ITEMS: AdminTab[] = ["System", "Design", "Add"];

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

// --- Types ---
interface SysInfo {
  label: string;
  value: string;
  detail?: string;
  status?: "ok" | "warn" | "error" | "info";
}

// --- API base for admin calls ---
const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8080"
  : "https://webhooks.vibestribe.rocks";

// --- KB API base for system-status (model health + crons) ---
const KB_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8888"
  : "https://graphs.vibestribe.rocks";

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
  model_id: "", name: "", provider: "openrouter",
  tier: "free", role: "backup", context_limit: 128000,
  capabilities: "code, reasoning", api_key_name: "",
  api_key_value: "", credit_info: "",
};

const AdminControlCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>("System");
  const [showAddModel, setShowAddModel] = useState(false);
  const [formData, setFormData] = useState<AddModelFormData>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<string | null>(null);
  const [sysInfo, setSysInfo] = useState<SysInfo[]>([]);
  const [sysLoading, setSysLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState(() => localStorage.getItem("governor_admin_token") || "");
  const [tokenSaved, setTokenSaved] = useState(false);
  const [hermesKeyInput, setHermesKeyInput] = useState(() => localStorage.getItem("hermes_api_key") || "");
  const [hermesKeySaved, setHermesKeySaved] = useState(false);

  // Model + cron status from KB server
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [modelStatusLoading, setModelStatusLoading] = useState(false);

  const getAdminToken = useCallback(() => {
    return localStorage.getItem("governor_admin_token") || "";
  }, []);

  // --- Load system info on mount and when System tab is active ---
  const loadSystemInfo = useCallback(async () => {
    setSysLoading(true);
    try {
      // Query the governor for system health data
      const token = getAdminToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;

      const res = await fetch(API_BASE + "/api/admin/system", { headers });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSysInfo(data);
          setSysLoading(false);
          return;
        }
      }
    } catch {}

    // Fallback: show what we can determine client-side
    setSysInfo([]);
    setSysLoading(false);
  }, [getAdminToken]);

  // --- Load model + cron status from KB server ---
  const loadModelStatus = useCallback(async () => {
    setModelStatusLoading(true);
    try {
      const res = await fetch(KB_BASE + "/api/system-status");
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data);
      }
    } catch {}
    setModelStatusLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === "System") {
      loadSystemInfo();
      loadModelStatus();
    }
  }, [activeTab, loadSystemInfo, loadModelStatus]);

  // --- Add Model ---
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
        action: "add", model_id: formData.model_id,
        name: formData.name || formData.model_id,
        provider: formData.provider, tier: formData.tier, role: formData.role,
        context_limit: formData.context_limit,
        capabilities: formData.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
        credit_info: formData.credit_info,
      };
      if (formData.api_key_value) {
        body.api_key_name = formData.api_key_name || formData.provider.toUpperCase() + "_API_KEY";
        body.api_key_value = formData.api_key_value;
      }

      const resp = await fetch(API_BASE + "/api/admin/model", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        setSubmitResult("Model added successfully!");
        setFormData({ ...DEFAULT_FORM });
      } else {
        const err = await resp.text();
        setSubmitResult("Error: " + (err || resp.statusText));
      }
    } catch (e: any) {
      setSubmitResult("Error: " + (e.message || "Unknown"));
    } finally {
      setSubmitting(false);
    }
  };

  const subheading = useMemo(() => {
    switch (activeTab) {
      case "System": return "Full X220 resource breakdown: memory, disk, services, agents";
      case "Design": return "Visual QA, design review, and visual testing workflow";
      case "Add": return "Register a new model, platform, skill, or tool";
    }
    return "";
  }, [activeTab]);

  const heading = useMemo(() => {
    switch (activeTab) {
      case "System": return "System Health";
      case "Design": return "Design & Visual QA";
      case "Add": return "Add to VibePilot";
    }
    return "";
  }, [activeTab]);

  // --- Renderers ---

  const renderSystem = () => (
    <div className="admin-panel__card admin-panel__card--stacked">
      {/* Admin Token Input */}
      <div style={{ padding: "12px 14px", background: "#0d1117", borderRadius: 6, border: "1px solid #30363d", marginBottom: "8px" }}>
        <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Admin Token</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => { setTokenInput(e.target.value); setTokenSaved(false); }}
            placeholder="Enter governor admin token"
            style={{ ...inputStyle, marginTop: 0, flex: 1 }}
          />
          <button
            onClick={() => {
              localStorage.setItem("governor_admin_token", tokenInput);
              setTokenSaved(true);
              loadSystemInfo();
            }}
            style={{ ...primaryBtnStyle, whiteSpace: "nowrap" }}
          >
            {tokenSaved ? "Saved" : "Save"}
          </button>
        </div>
        <div style={{ color: "#9da5af", fontSize: 11, marginTop: 4 }}>
          Required for admin actions (models, system, task control). Stored in browser localStorage.
        </div>
      </div>
      {/* Hermes API Key */}
      <div style={{ padding: "12px 14px", background: "#0d1117", borderRadius: 6, border: "1px solid #30363d", marginBottom: "8px" }}>
        <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Hermes Chat API Key</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="password"
            value={hermesKeyInput}
            onChange={(e) => { setHermesKeyInput(e.target.value); setHermesKeySaved(false); }}
            placeholder="Enter Hermes API server key"
            style={{ ...inputStyle, marginTop: 0, flex: 1 }}
          />
          <button
            onClick={() => {
              localStorage.setItem("hermes_api_key", hermesKeyInput);
              setHermesKeySaved(true);
            }}
            style={{ ...primaryBtnStyle, whiteSpace: "nowrap" }}
          >
            {hermesKeySaved ? "Saved" : "Save"}
          </button>
        </div>
        <div style={{ color: "#9da5af", fontSize: 11, marginTop: 4 }}>
          Required for Vibes dashboard chat. Stored in browser localStorage.
        </div>
      </div>
      {sysLoading ? (
        <div style={{ padding: "20px", textAlign: "center", color: "#9da5af" }}>Loading system data...</div>
      ) : sysInfo.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {sysInfo.map((item, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", background: "#0d1117", borderRadius: 6,
              border: "1px solid #30363d",
            }}>
              <div>
                <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                {item.detail && <div style={{ color: "#9da5af", fontSize: 11, marginTop: 2 }}>{item.detail}</div>}
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: item.status === "ok" ? "#3fb950" : item.status === "warn" ? "#d29922" : item.status === "error" ? "#f85149" : "#9da5af",
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ padding: "12px", background: "rgba(245,158,11,0.1)", borderRadius: 6, marginBottom: 12, color: "#d29922", fontSize: 13 }}>
            System health API not available from dashboard. Go in server-side agent for a full breakdown.
          </div>
          <div style={{ textAlign: "center", padding: "20px" }}>
            <button onClick={loadSystemInfo} style={{ ...primaryBtnStyle, fontSize: 13 }}>
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Model Health + Cron Status */}
      {modelStatus && (
        <>
          {/* Error summary */}
          {modelStatus.errors_today && (
            <div style={{ marginTop: 8, padding: "10px 14px", background: "#0d1117", borderRadius: 6, border: "1px solid #30363d" }}>
              <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Errors Today</div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                <span style={{ color: modelStatus.errors_today.rate_limit_429 > 20 ? "#f85149" : "#d29922" }}>
                  429 Rate Limits: {modelStatus.errors_today.rate_limit_429 || 0}
                </span>
                <span style={{ color: modelStatus.errors_today.bad_request_400 > 10 ? "#f85149" : "#9da5af" }}>
                  400 Bad Requests: {modelStatus.errors_today.bad_request_400 || 0}
                </span>
                <span style={{ color: "#9da5af" }}>
                  Total: {modelStatus.errors_today.total_warnings || 0}
                </span>
              </div>
            </div>
          )}

          {/* Model Health */}
          <div style={{ marginTop: 8 }}>
            <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, marginBottom: 6, padding: "0 2px" }}>
              Model Health
            </div>
            {modelStatus.primary_model && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "#0d1117", borderRadius: 6,
                border: `1px solid ${modelStatus.primary_model.healthy ? "#238636" : "#da3633"}`,
                marginBottom: 4,
              }}>
                <div>
                  <span style={{ fontSize: 10, color: "#9da5af", marginRight: 6 }}>PRIMARY</span>
                  <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 600 }}>{modelStatus.primary_model.model}</span>
                  <span style={{ color: "#9da5af", fontSize: 11, marginLeft: 6 }}>({modelStatus.primary_model.provider})</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: modelStatus.primary_model.healthy ? "#3fb950" : "#f85149" }}>
                  {modelStatus.primary_model.healthy ? "OK" : modelStatus.primary_model.detail || "FAIL"}
                </div>
              </div>
            )}
            {modelStatus.models && modelStatus.models.length > 0 && (
              modelStatus.models.map((m: any, i: number) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 14px", background: "#0d1117", borderRadius: 6,
                  border: `1px solid ${m.healthy ? "#23863655" : "#da363355"}`,
                  marginBottom: 3,
                }}>
                  <div>
                    <span style={{ fontSize: 10, color: "#9da5af", marginRight: 6 }}>FALLBACK</span>
                    <span style={{ color: "#c9d1d9", fontSize: 12 }}>{m.model}</span>
                    <span style={{ color: "#9da5af", fontSize: 11, marginLeft: 4 }}>({m.provider})</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: m.healthy ? "#3fb950" : "#f85149" }}>
                    {m.healthy ? "OK" : m.detail}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Cron Jobs */}
          {modelStatus.crons && modelStatus.crons.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 600, marginBottom: 6, padding: "0 2px" }}>
                Cron Jobs ({modelStatus.crons.length})
              </div>
              {modelStatus.crons.map((c: any, i: number) => {
                const isOk = c.last_status === "ok";
                const scheduleStr = typeof c.schedule === "object" ? c.schedule?.display || "?" : c.schedule;
                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 14px", background: "#0d1117", borderRadius: 6,
                    border: "1px solid #30363d", marginBottom: 3,
                  }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      <span style={{ color: isOk ? "#3fb950" : "#f85149", fontSize: 11, fontWeight: 700, marginRight: 6 }}>
                        {isOk ? "OK" : c.last_status?.toUpperCase() || "?"}
                      </span>
                      <span style={{ color: "#c9d1d9", fontSize: 12 }}>{c.name}</span>
                    </div>
                    <div style={{ color: "#9da5af", fontSize: 11, whiteSpace: "nowrap", marginLeft: 8 }}>
                      {scheduleStr}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ textAlign: "center", marginTop: 8 }}>
            <button onClick={loadModelStatus} disabled={modelStatusLoading}
              style={{ ...primaryBtnStyle, fontSize: 13, opacity: modelStatusLoading ? 0.5 : 1 }}>
              {modelStatusLoading ? "Checking..." : "Refresh Models & Crons"}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderDesign = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <DesignHub />
      <VqaPanel onClose={() => {}} inline />
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
          <div style={{ marginTop: 12, padding: 10, borderRadius: 6,
            background: submitResult.startsWith("Error") ? "#3d1f1f" : "#1f3d1f",
            color: "#ffffff", fontSize: 14 }}>
            {submitResult}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={() => { setShowAddModel(false); setSubmitResult(null); }}
            style={cancelBtnStyle}>Cancel</button>
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
      case "System": return renderSystem();
      case "Design": return renderDesign();
      case "Add": return (
        <div className="admin-panel__card admin-panel__card--stacked">
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            <button onClick={() => setShowAddModel(true)} style={primaryBtnStyle}>Add Model</button>
            <button style={{ ...primaryBtnStyle, background: "#1f6feb" }}>Add Platform</button>
            <button style={{ ...primaryBtnStyle, background: "#d29922" }}>Add Skill</button>
            <button style={{ ...primaryBtnStyle, background: "#8b5cf6" }}>Add Tool</button>
          </div>
          <p style={{ color: "#9da5af", fontSize: 13 }}>
            Adding items requires the server-side agent or API admin token. These buttons open the process. Click Add Model to register a new AI model with the system.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="admin-console">
      {showAddModel && renderAddModelForm()}
      <header className="admin-console__bar">
        <div className="admin-console__title">Vibeflow Control Center</div>
        <nav className="admin-console__nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <button key={item}
              className={"admin-nav__item " + (activeTab === item ? "admin-nav__item--active" : "")}
              onClick={() => setActiveTab(item)} type="button">
              {item}
            </button>
          ))}
        </nav>
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

export default AdminControlCenter;
