import React, { useEffect, useMemo, useRef, useState } from "react";
import { MissionEvent } from "../../../../src/utils/events";
import { TaskSnapshot } from "@core/types";
import { resolveDashboardPath } from "../../utils/paths";

type AdminTab = "Orchestrator" | "Agents" | "Models" | "MCP" | "Logs" | "Settings";

interface AdminControlCenterProps {
  events: MissionEvent[];
  tasks: TaskSnapshot[];
}

interface AgentControl {
  id: string;
  name: string;
  role: string;
  llm: string;
  model?: string;
  prompt: string;
  skills?: string[];
  notes?: string;
}

interface OrchestratorControl {
  llm: string;
  model?: string;
  prompt: string;
  auto_dispatch?: boolean;
  queue_path?: string;
  events_path?: string;
  skills?: string[];
}

interface McpTool {
  name: string;
  description: string;
}

interface McpConfig {
  host?: string;
  port?: number;
  token_env?: string;
  queue_dir?: string;
  processed_dir?: string;
  failed_dir?: string;
  tools?: McpTool[];
  notes?: string[];
}

interface AdminConfig {
  updated_at?: string;
  default_llm?: string;
  orchestrator: OrchestratorControl;
  agents: AgentControl[];
  mcp?: McpConfig;
}

interface LlmProvider {
  id: string;
  label: string;
  model?: string;
  priority?: number;
  enabled?: boolean;
  modes?: string[];
  max_output_tokens?: number;
  api_key_env?: string;
}

const NAV_ITEMS: AdminTab[] = ["Orchestrator", "Agents", "Models", "MCP", "Logs", "Settings"];
const STORAGE_KEY = "vibeflow-admin-overrides";
const PROVIDER_STORAGE_KEY = "vibeflow-admin-providers";

const fallbackProviders: LlmProvider[] = [
  { id: "openrouter", label: "OpenRouter GPT-4.1 Mini", model: "gpt-4.1-mini", enabled: true },
  { id: "deepseek", label: "DeepSeek Reasoner", model: "deepseek-reasoner", enabled: true },
  { id: "glm46", label: "GLM 4.6 Ultra", model: "glm-4.6-ultra", enabled: true },
  { id: "gemini", label: "Gemini 1.5 Pro", model: "gemini-1.5-pro-latest", enabled: true },
];

const fallbackConfig: AdminConfig = {
  updated_at: new Date().toISOString(),
  default_llm: "openrouter",
  orchestrator: {
    llm: "openrouter",
    model: "gpt-4.1-mini",
    prompt: "You are the Vibeflow orchestrator. Assign validated tasks to the best agent and emit clear status changes.",
    auto_dispatch: true,
    queue_path: "data/tasks/queued",
    events_path: "data/state/events.log.jsonl",
    skills: ["dag_executor"],
  },
  agents: [
    {
      id: "planner",
      name: "Planner Agent",
      role: "planner",
      llm: "deepseek",
      model: "deepseek-reasoner",
      prompt: "Break the mission into atomic tasks with dependencies, titles, and deliverables.",
      skills: ["plan", "scope"],
    },
    {
      id: "router",
      name: "Router",
      role: "router",
      llm: "openrouter",
      model: "gpt-4.1-mini",
      prompt: "Choose providers based on weights, latency targets, and credit status.",
      skills: ["route"],
    },
    {
      id: "supervisor",
      name: "Supervisor",
      role: "supervisor",
      llm: "openrouter",
      model: "gpt-4.1-mini",
      prompt: "Score outputs for safety, regression risk, and spec coverage. Approve only when ready_to_merge; otherwise emit a blocking note with fixes.",
      skills: ["review", "approve", "block"],
    },
    {
      id: "tester",
      name: "Tester",
      role: "tester",
      llm: "gemini",
      model: "gemini-1.5-pro-latest",
      prompt: "Generate and run focused checks against the latest change. Return pass/fail with reproduction steps, screenshots, and diffs when possible.",
      skills: ["test_runner", "visual_exec"],
    },
    {
      id: "watcher",
      name: "Watcher",
      role: "watcher",
      llm: "deepseek",
      model: "deepseek-reasoner",
      prompt: "Monitor task progress, detect stalls over 10 minutes, and recommend reroutes when a provider degrades. Emit MCP note events with reason codes.",
      skills: ["monitor", "reroute", "alert"],
    },
    {
      id: "researcher",
      name: "Researcher",
      role: "researcher",
      llm: "glm46",
      model: "glm-4.6-ultra",
      prompt: "Continuously scan docs, changelogs, and issues for mission-relevant intel. Summarize daily and attach citations.",
      skills: ["summarize", "scan", "digest"],
    },
    {
      id: "maintainer",
      name: "Maintenance",
      role: "maintenance",
      llm: "openrouter",
      model: "gpt-4.1-mini",
      prompt: "Handle refactors, dependency bumps, and cleanup tasks safely with tests and rollback notes.",
      skills: ["refactor", "upgrade", "cleanup"],
    },
  ],
  mcp: {
    host: "127.0.0.1",
    port: 3030,
    queue_dir: "data/tasks/queued",
    tools: [
      { name: "runSkill", description: "Execute a registered skill runner and return JSON output." },
      { name: "getTaskState", description: "Load the latest task state snapshot from disk." },
    ],
  },
};

const AdminControlCenter: React.FC<AdminControlCenterProps> = ({ events, tasks }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>("Orchestrator");
  const [config, setConfig] = useState<AdminConfig>(fallbackConfig);
  const [providers, setProviders] = useState<LlmProvider[]>(fallbackProviders);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState<{ id: string; label: string; model: string; apiKeyEnv: string }>({
    id: "",
    label: "",
    model: "",
    apiKeyEnv: "OPENROUTER_API_KEY",
  });
  const baselineRef = useRef<AdminConfig>(fallbackConfig);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus("loading");
      try {
        const [providerList, configPayload] = await Promise.all([fetchProviders(), fetchAdminConfig()]);
        if (cancelled) return;
        const mergedProviders = applyProviderOverrides(providerList);
        baselineRef.current = configPayload;
        setProviders(mergedProviders);
        setConfig(applyOverrides(configPayload));
        setStatus("ready");
        loadedRef.current = true;
      } catch (error) {
        console.warn("[admin] failed to load config, using fallback", error);
        if (cancelled) return;
        const mergedFallback = applyProviderOverrides(fallbackProviders);
        setProviders(mergedFallback);
        setConfig(applyOverrides(fallbackConfig));
        setStatus("error");
        loadedRef.current = true;
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const providerById = useMemo(() => new Map(providers.map((provider) => [provider.id, provider])), [providers]);
  const providerUsage = useMemo(() => buildProviderUsage(config), [config]);
  const activeTasks = useMemo(() => tasks.filter((task) => task.status !== "complete"), [tasks]);
  const recentEvents = useMemo(() => events.slice(0, 20), [events]);

  const handleSelectProvider = (target: "orchestrator" | AgentControl["id"], providerId: string) => {
    setConfig((prev) => {
      if (target === "orchestrator") {
        return { ...prev, orchestrator: { ...prev.orchestrator, llm: providerId } };
      }
      const nextAgents = prev.agents.map((agent) => (agent.id === target ? { ...agent, llm: providerId } : agent));
      return { ...prev, agents: nextAgents };
    });
  };

  const handlePromptChange = (target: "orchestrator" | AgentControl["id"], prompt: string) => {
    setConfig((prev) => {
      if (target === "orchestrator") {
        return { ...prev, orchestrator: { ...prev.orchestrator, prompt } };
      }
      const nextAgents = prev.agents.map((agent) => (agent.id === target ? { ...agent, prompt } : agent));
      return { ...prev, agents: nextAgents };
    });
  };

  const handleSaveOverrides = () => {
    try {
      persistOverrides(config);
      setSaveMessage("Saved locally for this browser session.");
    } catch (error) {
      setSaveMessage(`Save failed: ${(error as Error).message}`);
    }
  };

  const handleResetOverrides = () => {
    const baseline = cloneConfig(baselineRef.current);
    setConfig(baseline);
    clearOverrides();
    setSaveMessage("Reset to repo config.");
  };

  useEffect(() => {
    if (!loadedRef.current) return;
    persistOverrides(config);
    setSaveMessage("Autosaved locally.");
  }, [config]);

  const heading = useMemo(() => {
    switch (activeTab) {
      case "Orchestrator":
        return "Orchestrator runtime and routing";
      case "Agents":
        return "Agent LLM assignments and prompts";
      case "Models":
        return "LLM providers available to this mission";
      case "MCP":
        return "MCP server and skills";
      case "Logs":
        return "Recent mission events";
      case "Settings":
        return "Admin settings and persistence";
      default:
        return "Control Center";
    }
  }, [activeTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case "Orchestrator":
        return (
          <OrchestratorPanel
            config={config.orchestrator}
            providers={providers}
            providerById={providerById}
            onSelectProvider={handleSelectProvider}
            onPromptChange={handlePromptChange}
            tasks={activeTasks}
            events={recentEvents}
          />
        );
      case "Agents":
        return (
          <AgentPanel
            agents={config.agents}
            providers={providers}
            providerById={providerById}
            onSelectProvider={handleSelectProvider}
            onPromptChange={handlePromptChange}
          />
        );
      case "Models":
        return (
          <ModelPanel
            providers={providers}
            usage={providerUsage}
            newProvider={newProvider}
            providerMessage={providerMessage}
            onChange={(field, value) => {
              setNewProvider((prev) => ({ ...prev, [field]: value }));
              setProviderMessage(null);
            }}
            onAdd={() => {
              const payload: LlmProvider = {
                id: newProvider.id.trim(),
                label: newProvider.label.trim(),
                model: newProvider.model.trim(),
                api_key_env: newProvider.apiKeyEnv.trim() || undefined,
                enabled: true,
              };
              setProviders((prev) => {
                const next = prev.some((p) => p.id === payload.id) ? prev.map((p) => (p.id === payload.id ? payload : p)) : [...prev, payload];
                persistProviderOverrides(next);
                setProviderMessage("Saved locally");
                return next;
              });
              setNewProvider({ id: "", label: "", model: "", apiKeyEnv: "OPENROUTER_API_KEY" });
            }}
          />
        );
      case "MCP":
        return <McpPanel config={config.mcp} />;
      case "Logs":
        return <LogPanel events={recentEvents} />;
      case "Settings":
        return (
          <SettingsPanel
            config={config}
            status={status}
            onSave={handleSaveOverrides}
            onReset={handleResetOverrides}
            message={saveMessage}
            providers={providers}
          />
        );
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
          <button type="button" className="admin-primary" onClick={handleSaveOverrides}>
            Save overrides
          </button>
          <button type="button" className="admin-ghost-button" onClick={handleResetOverrides}>
            Reset
          </button>
        </div>
      </header>

      <div className="admin-hero">
        <span className="admin-hero__eyebrow">Mission Control · Vibeflow</span>
        <div className="admin-hero__headline">
          <h1>Control Center</h1>
          <span className="admin-hero__pill">{activeTab}</span>
        </div>
        <p className="admin-hero__subhead">{heading}</p>
      </div>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h2>{heading}</h2>
          <p>Updated {config.updated_at ? new Date(config.updated_at).toLocaleString() : "recently"}</p>
        </div>
        {renderActiveTab()}
      </section>
    </div>
  );
};

export default AdminControlCenter;

function OrchestratorPanel({
  config,
  providers,
  providerById,
  tasks,
  events,
  onSelectProvider,
  onPromptChange,
}: {
  config: OrchestratorControl;
  providers: LlmProvider[];
  providerById: Map<string, LlmProvider>;
  tasks: TaskSnapshot[];
  events: MissionEvent[];
  onSelectProvider: (target: "orchestrator", providerId: string) => void;
  onPromptChange: (target: "orchestrator", prompt: string) => void;
}) {
  const activeProvider = providerById.get(config.llm);
  const recentTasks = tasks.slice(0, 4);
  const recentEvents = events.filter((event) => event.type.includes("route") || event.type === "status_change").slice(0, 5);

  return (
    <div className="admin-grid admin-grid--double">
      <div className="admin-panel__card admin-panel__card--deep">
        <div className="admin-panel__row">
          <h3 className="admin-panel__title">Orchestrator Runtime</h3>
          <span className="admin-status admin-status--info">
            Auto-dispatch {config.auto_dispatch === false ? "off (not recommended)" : "on (enforced)"}
          </span>
        </div>
        <div className="admin-meta">
          <div>Queue: {config.queue_path ?? "data/tasks/queued"}</div>
          <div>Events: {config.events_path ?? "data/state/events.log.jsonl"}</div>
        </div>
        <div className="mission-field">
          <label>
            LLM Provider
            <select value={config.llm} onChange={(event) => onSelectProvider("orchestrator", event.target.value)}>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label} {provider.enabled === false ? "(disabled)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="admin-meta">
          <div>Model: {config.model ?? activeProvider?.model ?? "unspecified"}</div>
          <div>Skills: {(config.skills ?? ["dag_executor"]).join(", ")}</div>
        </div>
        <div className="mission-field">
          <label>
            Dispatch prompt
            <textarea value={config.prompt} onChange={(event) => onPromptChange("orchestrator", event.target.value)} rows={6} />
          </label>
        </div>
        <p className="admin-hero__subhead">
          The orchestrator calls router.decide() then emits status_change events and updates task.state.json so the dashboard shows live
          assignments.
        </p>
      </div>
      <div className="admin-panel__card admin-panel__card--stacked">
        <div className="admin-panel__row">
          <h3 className="admin-panel__title">Live queue</h3>
          <span className="admin-pill admin-pill--route">{recentTasks.length} active</span>
        </div>
        <ul className="admin-list">
          {recentTasks.length === 0 && <li>No active tasks yet.</li>}
          {recentTasks.map((task) => (
            <li key={task.id}>
              {task.taskNumber ?? task.title} — {task.status} · {task.owner ?? "unassigned"}
            </li>
          ))}
        </ul>
        <div className="admin-panel__row">
          <h4 className="admin-panel__title">Latest routing events</h4>
        </div>
        <ul className="admin-list">
          {recentEvents.length === 0 && <li>No routing events recorded.</li>}
          {recentEvents.map((event) => {
            const detailMessage = typeof event.details?.["message"] === "string" ? event.details?.["message"] : "";
            return (
              <li key={event.id}>
                {event.type} · {new Date(event.timestamp).toLocaleTimeString()} · {event.reasonCode ?? detailMessage ?? ""}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function AgentPanel({
  agents,
  providers,
  providerById,
  onSelectProvider,
  onPromptChange,
}: {
  agents: AgentControl[];
  providers: LlmProvider[];
  providerById: Map<string, LlmProvider>;
  onSelectProvider: (target: AgentControl["id"], providerId: string) => void;
  onPromptChange: (target: AgentControl["id"], prompt: string) => void;
}) {
  return (
    <div className="admin-grid admin-grid--double">
      {agents.map((agent) => {
        const provider = providerById.get(agent.llm);
        return (
          <div key={agent.id} className="admin-panel__card admin-panel__card--deep">
            <div className="admin-panel__row">
              <h3 className="admin-panel__title">{agent.name}</h3>
              <span className="admin-pill admin-pill--route">{agent.role}</span>
            </div>
            <div className="mission-field">
              <label>
                LLM Provider
                <select value={agent.llm} onChange={(event) => onSelectProvider(agent.id, event.target.value)}>
                  {providers.map((providerOption) => (
                    <option key={providerOption.id} value={providerOption.id}>
                      {providerOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="admin-meta">
              <div>Model: {agent.model ?? provider?.model ?? "unspecified"}</div>
              <div>Skills: {(agent.skills ?? []).join(", ") || "n/a"}</div>
            </div>
            <div className="mission-field">
              <label>
                Prompt
                <textarea value={agent.prompt} onChange={(event) => onPromptChange(agent.id, event.target.value)} rows={5} />
              </label>
            </div>
            {agent.notes && <p className="admin-hero__subhead">{agent.notes}</p>}
          </div>
        );
      })}
      {agents.length === 0 && <div className="admin-panel__card">No agents configured.</div>}
    </div>
  );
}

function ModelPanel({
  providers,
  usage,
  newProvider,
  providerMessage,
  onChange,
  onAdd,
}: {
  providers: LlmProvider[];
  usage: Record<string, string[]>;
  newProvider: { id: string; label: string; model: string; apiKeyEnv: string };
  providerMessage: string | null;
  onChange: (field: keyof typeof newProvider, value: string) => void;
  onAdd: () => void;
}) {
  return (
    <>
      <div className="admin-grid admin-grid--double">
        {providers.map((provider) => (
          <div key={provider.id} className="admin-panel__card admin-panel__card--deep">
            <div className="admin-panel__row">
              <h3 className="admin-panel__title">{provider.label}</h3>
              <span className={`admin-status ${provider.enabled === false ? "admin-status--warn" : "admin-status--success"}`}>
                {provider.enabled === false ? "Disabled" : "Ready"}
              </span>
            </div>
            <div className="admin-meta">
              <div>ID: {provider.id}</div>
              <div>Model: {provider.model ?? "n/a"}</div>
              <div>API Key Env: {provider.api_key_env ?? "N/A"}</div>
              <div>Context: {provider.max_output_tokens ? `${provider.max_output_tokens.toLocaleString()} tokens` : "unknown"}</div>
            </div>
            <div className="admin-pill admin-pill--route">Modes: {(provider.modes ?? ["text"]).join(", ")}</div>
            <p className="admin-hero__subhead">
              Used by: {usage[provider.id]?.length ? usage[provider.id].join(", ") : "not wired yet"}
            </p>
          </div>
        ))}
        {providers.length === 0 && <div className="admin-panel__card">No provider registry found.</div>}
      </div>
      <div className="admin-panel__card admin-panel__card--deep" style={{ marginTop: 16 }}>
        <div className="admin-panel__row">
          <h3 className="admin-panel__title">Add provider (e.g. OpenRouter model)</h3>
          {providerMessage && <span className="admin-pill admin-pill--route">{providerMessage}</span>}
        </div>
        <div className="admin-grid admin-grid--double">
          <label className="mission-field">
            Provider ID
            <input value={newProvider.id} onChange={(e) => onChange("id", e.target.value)} placeholder="openrouter/gpt-4.1-mini" />
          </label>
          <label className="mission-field">
            Label
            <input value={newProvider.label} onChange={(e) => onChange("label", e.target.value)} placeholder="OpenRouter GPT-4.1 Mini" />
          </label>
          <label className="mission-field">
            Model
            <input value={newProvider.model} onChange={(e) => onChange("model", e.target.value)} placeholder="gpt-4.1-mini" />
          </label>
          <label className="mission-field">
            API Key Env
            <input value={newProvider.apiKeyEnv} onChange={(e) => onChange("apiKeyEnv", e.target.value)} placeholder="OPENROUTER_API_KEY" />
          </label>
        </div>
        <p className="admin-hero__subhead">
          Keys live in GitHub/Vercel secrets. Add any OpenRouter-capable model or direct Gemini/DeepSeek/GLM entries here; they persist locally for
          this browser.
        </p>
        <div className="admin-panel__row">
          <button type="button" className="admin-primary" onClick={onAdd} disabled={!newProvider.id || !newProvider.label || !newProvider.model}>
            Add provider
          </button>
        </div>
      </div>
    </>
  );
}

function McpPanel({ config }: { config?: McpConfig }) {
  const tools = config?.tools ?? [];
  const notes = config?.notes ?? [];
  return (
    <div className="admin-grid admin-grid--double">
      <div className="admin-panel__card admin-panel__card--deep">
        <div className="admin-panel__row">
          <h3 className="admin-panel__title">MCP Server</h3>
          <span className="admin-status admin-status--info">Port {config?.port ?? 3030}</span>
        </div>
        <div className="admin-meta">
          <div>Host: {config?.host ?? "127.0.0.1"}</div>
          <div>Queue: {config?.queue_dir ?? "data/tasks/queued"}</div>
          <div>Processed: {config?.processed_dir ?? "data/tasks/processed"}</div>
          <div>Failed: {config?.failed_dir ?? "data/tasks/failed"}</div>
          <div>Token env: {config?.token_env ?? "MCP_SERVER_TOKEN"}</div>
        </div>
        <p className="admin-hero__subhead">
          POST /run-task validates task_packet.schema.json, calls orchestrator.dispatch, then writes to queue for auto_runner.
        </p>
      </div>
      <div className="admin-panel__card admin-panel__card--stacked">
        <div className="admin-panel__row">
          <h3 className="admin-panel__title">Registered tools</h3>
        </div>
        <ul className="admin-list">
          {tools.length === 0 && <li>No tools registered.</li>}
          {tools.map((tool) => (
            <li key={tool.name}>
              <strong>{tool.name}</strong> — {tool.description}
            </li>
          ))}
        </ul>
        {notes.length > 0 && (
          <>
            <div className="admin-panel__row">
              <h4 className="admin-panel__title">Notes</h4>
            </div>
            <ul className="admin-list">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function LogPanel({ events }: { events: MissionEvent[] }) {
  return (
    <div className="admin-panel__card admin-panel__card--stacked">
      <ul className="admin-list">
        {events.length === 0 && <li>No mission events yet.</li>}
        {events.map((event) => {
          const message = typeof event.details?.message === "string" ? event.details.message : event.reasonCode ?? "";
          return (
            <li key={event.id}>
              <strong>{event.type}</strong> — {new Date(event.timestamp).toLocaleString()}
              {message && <> · {message}</>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SettingsPanel({
  config,
  providers,
  status,
  onSave,
  onReset,
  message,
}: {
  config: AdminConfig;
  providers: LlmProvider[];
  status: "idle" | "loading" | "ready" | "error";
  onSave: () => void;
  onReset: () => void;
  message: string | null;
}) {
  return (
    <div className="admin-panel__card admin-panel__card--stacked">
      <p>Status: {status === "ready" ? "Loaded" : status}</p>
      <p>Default LLM: {config.default_llm ?? "openrouter"}</p>
      <p>Providers loaded: {providers.length}</p>
      <p className="admin-hero__subhead">Changes auto-save locally and also persist when you click Save overrides.</p>
      <div className="admin-panel__row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" className="admin-primary" onClick={onSave}>
          Save overrides
        </button>
        <button type="button" className="admin-ghost-button" onClick={onReset}>
          Reset to repo config
        </button>
      </div>
      <p className="admin-hero__subhead">
        Overrides are stored locally in your browser (no backend write yet). Update agent LLMs or prompts, save, and refresh to keep them.
      </p>
      {message && <p className="admin-hero__subhead">{message}</p>}
    </div>
  );
}

async function fetchProviders(): Promise<LlmProvider[]> {
  const response = await fetch(resolveDashboardPath("data/registry/llm_providers.json"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Provider registry unavailable (${response.status})`);
  }
  const payload = await response.json();
  const providers = Array.isArray(payload.providers) ? payload.providers : [];
  return providers
    .map((provider: Record<string, unknown>) => ({
      id: readString(provider, ["id"]) ?? "unknown",
      label: readString(provider, ["label", "name"]) ?? "Unnamed provider",
      model: readString(provider, ["model"]),
      priority: readNumber(provider, ["priority"]),
      enabled: provider["enabled"] !== false,
      modes: Array.isArray(provider["modes"]) ? (provider["modes"] as string[]) : undefined,
      max_output_tokens: readNumber(provider, ["max_output_tokens"]),
      api_key_env: readString(provider, ["api_key_env"]),
    }))
    .sort((a: LlmProvider, b: LlmProvider) => (b.priority ?? 0) - (a.priority ?? 0));
}

async function fetchAdminConfig(): Promise<AdminConfig> {
  const response = await fetch(resolveDashboardPath("data/state/agent_controls.json"), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Admin config unavailable (${response.status})`);
  }
  const payload = await response.json();
  return normalizeConfig(payload);
}

function normalizeConfig(raw: Record<string, unknown>): AdminConfig {
  return {
    updated_at: readString(raw, ["updated_at", "updatedAt"]) ?? new Date().toISOString(),
    default_llm: readString(raw, ["default_llm", "defaultLlm"]) ?? "openrouter",
    orchestrator: normalizeOrchestrator(raw["orchestrator"]),
    agents: Array.isArray(raw["agents"])
      ? (raw["agents"] as Record<string, unknown>[]).map(normalizeAgentControl).filter(Boolean)
      : [],
    mcp: normalizeMcp(raw["mcp"]),
  };
}

function normalizeOrchestrator(raw: unknown): OrchestratorControl {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    llm: readString(source, ["llm"]) ?? fallbackConfig.orchestrator.llm,
    model: readString(source, ["model"]),
    prompt: readString(source, ["prompt"]) ?? fallbackConfig.orchestrator.prompt,
    auto_dispatch: readBoolean(source, ["auto_dispatch", "autoDispatch"], true),
    queue_path: readString(source, ["queue_path", "queuePath"]) ?? "data/tasks/queued",
    events_path: readString(source, ["events_path", "eventsPath"]) ?? "data/state/events.log.jsonl",
    skills: Array.isArray(source["skills"]) ? (source["skills"] as string[]) : ["dag_executor"],
  };
}

function normalizeAgentControl(raw: Record<string, unknown>): AgentControl {
  return {
    id: readString(raw, ["id"]) ?? `agent-${Math.random().toString(36).slice(2, 6)}`,
    name: readString(raw, ["name"]) ?? "Agent",
    role: readString(raw, ["role"]) ?? "agent",
    llm: readString(raw, ["llm"]) ?? "openrouter",
    model: readString(raw, ["model"]),
    prompt: readString(raw, ["prompt"]) ?? "",
    skills: Array.isArray(raw["skills"]) ? (raw["skills"] as string[]) : [],
    notes: readString(raw, ["notes"]),
  };
}

function normalizeMcp(raw: unknown): McpConfig {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const source = raw as Record<string, unknown>;
  return {
    host: readString(source, ["host"]),
    port: readNumber(source, ["port"]),
    token_env: readString(source, ["token_env"]),
    queue_dir: readString(source, ["queue_dir"]),
    processed_dir: readString(source, ["processed_dir"]),
    failed_dir: readString(source, ["failed_dir"]),
    tools: Array.isArray(source["tools"])
      ? (source["tools"] as Record<string, unknown>[]).map((tool) => ({
          name: readString(tool, ["name"]) ?? "tool",
          description: readString(tool, ["description"]) ?? "",
        }))
      : [],
    notes: Array.isArray(source["notes"]) ? (source["notes"] as string[]) : [],
  };
}

function applyOverrides(config: AdminConfig): AdminConfig {
  if (typeof window === "undefined") return config;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return config;
  try {
    const parsed = normalizeConfig(JSON.parse(raw));
    return mergeConfig(config, parsed);
  } catch (error) {
    console.warn("[admin] failed to parse overrides", error);
    return config;
  }
}

function persistOverrides(config: AdminConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function clearOverrides() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

function mergeConfig(base: AdminConfig, override: AdminConfig): AdminConfig {
  return {
    ...base,
    ...override,
    orchestrator: { ...base.orchestrator, ...override.orchestrator },
    agents: override.agents && override.agents.length > 0 ? override.agents : base.agents,
    mcp: { ...base.mcp, ...override.mcp },
  };
}

function applyProviderOverrides(base: LlmProvider[]): LlmProvider[] {
  if (typeof window === "undefined") return base;
  const raw = window.localStorage.getItem(PROVIDER_STORAGE_KEY);
  if (!raw) return base;
  try {
    const overrides: LlmProvider[] = JSON.parse(raw);
    const merged = [...base];
    overrides.forEach((entry) => {
      const index = merged.findIndex((p) => p.id === entry.id);
      if (index >= 0) {
        merged[index] = { ...merged[index], ...entry };
      } else {
        merged.push(entry);
      }
    });
    return merged;
  } catch (error) {
    console.warn("[admin] failed to parse provider overrides", error);
    return base;
  }
}

function buildProviderUsage(config: AdminConfig): Record<string, string[]> {
  const usage: Record<string, string[]> = {};
  const record = (providerId: string, label: string) => {
    if (!providerId) return;
    if (!usage[providerId]) usage[providerId] = [];
    usage[providerId].push(label);
  };
  record(config.orchestrator.llm, "orchestrator");
  (config.agents ?? []).forEach((agent) => record(agent.llm, agent.name));
  return usage;
}

function cloneConfig(config: AdminConfig): AdminConfig {
  return JSON.parse(JSON.stringify(config)) as AdminConfig;
}

function readString(entry: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function readNumber(entry: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
}

function readBoolean(entry: Record<string, unknown>, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase().trim();
      if (normalized === "true" || normalized === "1" || normalized === "yes") {
        return true;
      }
      if (normalized === "false" || normalized === "0" || normalized === "no") {
        return false;
      }
    }
  }
  return fallback;
}

function persistProviderOverrides(providers: LlmProvider[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROVIDER_STORAGE_KEY, JSON.stringify(providers));
  } catch (error) {
    console.warn("[admin] unable to persist provider overrides", error);
  }
}
