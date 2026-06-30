import React, { useState, useEffect, useCallback } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ConnectedService {
  url: string;
  type: string;
  label: string;
}

interface ProjectInfo {
  id: string;
  slug: string;
  display_name: string;
  description: string | null;
  status: string;
  theme?: { primary_color?: string } | null;
  deploy_url?: string | null;
  github_owner?: string | null;
  github_repo?: string | null;
  total_tasks?: number;
  completed_tasks?: number;
  connected_services?: ConnectedService[];
}

interface HexagonOverviewProps {
  onSelectProject: (slug: string) => void;
  selectedSlug?: string;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  github: (<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.61 8.21 11.16.6.11.82-.25.82-.56v-2.02c-3.34.71-4.04-1.58-4.04-1.58-.55-1.37-1.34-1.74-1.34-1.74-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.82 0-1.29.47-2.34 1.24-3.17-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.53 3.3-1.21 3.3-1.21.66 1.66.25 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.52-2.81 5.52-5.49 5.81.43.36.81 1.08.81 2.18v3.24c0 .31.22.68.83.56A12.01 12.01 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" /></svg>),
  vercel: (<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M12 2L2 19.5h20L12 2z" /></svg>),
  cloudflare: (<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M16.3 13.4c.1-.4 0-.9-.3-1.2l-2-2.4c-.2-.2-.5-.4-.8-.4H8.3c-.3 0-.6.1-.8.4l-2 2.4c-.3.3-.4.8-.3 1.2L5.5 16c.1.5.5.8 1 .8h2.9c.3 0 .5-.1.7-.3l.3-.3.3.3c.2.2.4.3.7.3h2.9c.5 0 .9-.3 1-.8l1.1-2.6z" /></svg>),
  openrouter: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" /></svg>),
  google: (<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" /><path d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.9C4.1 20.7 7.8 23 12 23z" /><path d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.6.4-2.3V6.8H2.3C1.4 8.4 1 10.1 1 12s.4 3.6 1.3 5.2L6 14.3z" /><path d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.8 1 4.1 3.3 2.3 6.8L6 9.7c.9-2.5 3.2-4.3 6-4.3z" /></svg>),
  groq: (<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M13 2L4.5 12.5h6.5l-1.5 9L18.5 11H12l1-9z" /></svg>),
  zai: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M4 4h16L8 20h12" /></svg>),
  dashboard: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>),
};

function iconFor(type: string): React.ReactNode {
  return SERVICE_ICONS[type] || (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

const SERVICE_TYPES = ["github", "vercel", "cloudflare", "openrouter", "google", "groq", "zai", "default"];
const TYPE_LABELS: Record<string, string> = { github: "GitHub", vercel: "Vercel", cloudflare: "Cloudflare", openrouter: "OpenRouter", google: "Google", groq: "Groq", zai: "Z.AI", default: "Other" };

// ─── Component ──────────────────────────────────────────────────────────────

const GOV_API = (() => {
  if (import.meta.env.VITE_GOVERNOR_API) return import.meta.env.VITE_GOVERNOR_API;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://webhooks.vibestribe.rocks";
  }
  return "http://localhost:8080";
})();

const HexagonOverview: React.FC<HexagonOverviewProps> = ({ onSelectProject, selectedSlug }) => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [customServices, setCustomServices] = useState<Record<string, ConnectedService[]>>({});
  const [hiddenServices, setHiddenServices] = useState<Record<string, string[]>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", url: "", type: "default" });
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [projectForm, setProjectForm] = useState({ slug: "", display_name: "", description: "", github_owner: "VibesTribe", github_repo: "", deploy_target: "vercel" });
  const [projectError, setProjectError] = useState("");
  const [creating, setCreating] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${GOV_API}/api/projects`);
      if (!res.ok) return;
      const data = await res.json();
      const enriched = await Promise.all(data.map(async (p: ProjectInfo) => {
        if (p.connected_services?.length) return p;
        if (p.slug === "vibepilot") {
          return {
            ...p,
            connected_services: [
              { url: "https://github.com/VibesTribe/VibePilot", type: "github", label: "VibePilot Repo" },
              { url: "https://github.com/VibesTribe/vibeflow", type: "github", label: "VibeFlow Dashboard" },
              { url: "https://vercel.com/vibestribe", type: "vercel", label: "Vercel" },
              { url: "https://dash.cloudflare.com", type: "cloudflare", label: "Cloudflare" },
              { url: "https://openrouter.ai/", type: "openrouter", label: "OpenRouter" },
              { url: "https://aistudio.google.com", type: "google", label: "Google AI Studio" },
              { url: "https://console.groq.com/home", type: "groq", label: "Groq Console" },
              { url: "https://z.ai/manage-apikey/coding-plan/personal/usage", type: "zai", label: "Z.AI (GLM)" },
            ],
          };
        }
        return p;
      }));
      setProjects(enriched);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  useEffect(() => {
    const c = localStorage.getItem("vp_custom_services");
    if (c) setCustomServices(JSON.parse(c));
    const h = localStorage.getItem("vp_hidden_services");
    if (h) setHiddenServices(JSON.parse(h));
  }, []);

  useEffect(() => { localStorage.setItem("vp_custom_services", JSON.stringify(customServices)); }, [customServices]);
  useEffect(() => { localStorage.setItem("vp_hidden_services", JSON.stringify(hiddenServices)); }, [hiddenServices]);

  // ─── Services logic ──────────────────────────────────────────────────────

  const getServices = useCallback((slug: string): ConnectedService[] => {
    const project = projects.find(p => p.slug === slug);
    const all = [...(project?.connected_services || []), ...(customServices[slug] || [])];
    const hidden = hiddenServices[slug] || [];
    const seen = new Set<string>();
    return all
      .filter(s => !hidden.includes(s.url))
      .filter(s => { const k = s.url || s.label; if (seen.has(k)) return false; seen.add(k); return true; });
  }, [projects, customServices, hiddenServices]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const hideTile = useCallback((slug: string, url: string) => {
    setHiddenServices(prev => ({ ...prev, [slug]: [...(prev[slug] || []), url] }));
  }, []);

  const restoreTile = useCallback((slug: string, url: string) => {
    setHiddenServices(prev => ({ ...prev, [slug]: (prev[slug] || []).filter(u => u !== url) }));
  }, []);

  const submitAddForm = useCallback((slug: string) => {
    if (!addForm.label.trim() || !addForm.url.trim()) return;
    const newService: ConnectedService = {
      label: addForm.label.trim(),
      url: addForm.url.trim(),
      type: addForm.type,
    };
    setCustomServices(prev => ({ ...prev, [slug]: [...(prev[slug] || []), newService] }));
    setAddForm({ label: "", url: "", type: "default" });
    setShowAddForm(false);
  }, [addForm]);

  // ─── Create project ──────────────────────────────────────────────────────

  const submitProjectForm = useCallback(async () => {
    if (!projectForm.slug.trim()) return;
    setCreating(true);
    setProjectError("");
    try {
      const res = await fetch(`${GOV_API}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...projectForm,
          theme: { primary_color: "#34d399" },
        }),
      });
      if (res.status === 409) {
        setProjectError("A project with this slug already exists. Choose a different name.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProjectError(data.message || "Failed to create project");
        return;
      }
      // Success — refresh projects, close form, expand the new project
      await fetchProjects();
      setShowProjectForm(false);
      setProjectForm({ slug: "", display_name: "", description: "", github_owner: "VibesTribe", github_repo: "", deploy_target: "vercel" });
      setExpandedSlug(projectForm.slug);
    } catch {
      setProjectError("Network error — is the governor running?");
    } finally {
      setCreating(false);
    }
  }, [projectForm, fetchProjects]);

  const handleServiceClick = useCallback((service: ConnectedService) => {
    if (editMode) return; // don't navigate when editing
    if (service.url) window.open(service.url, "_blank", "noopener,noreferrer");
  }, [editMode]);

  const handleHexClick = useCallback((slug: string) => {
    if (expandedSlug === slug) onSelectProject(slug);
    else { setExpandedSlug(slug); setEditMode(false); }
  }, [expandedSlug, onSelectProject]);

  // ─── Satellite positions ─────────────────────────────────────────────────

  function getSatellitePositions(count: number) {
    const radius = Math.max(160, 130 + count * 8);
    const positions = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
      positions.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
    }
    return positions;
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="hex-loading">
        <div className="hex-pulse-ring" />
        <span>Loading…</span>
      </div>
    );
  }

  const expandedProject = expandedSlug ? projects.find(p => p.slug === expandedSlug) : null;
  const expandedServices = expandedSlug ? getServices(expandedSlug) : [];
  const hiddenList = expandedSlug ? [...(projects.find(p => p.slug === expandedSlug)?.connected_services || []), ...(customServices[expandedSlug] || [])].filter(s => (hiddenServices[expandedSlug] || []).includes(s.url)) : [];
  const sats = expandedServices;
  const positions = getSatellitePositions(sats.length);

  return (
    <div className="hexagon-overview">
      {expandedSlug && <div className="hex-backdrop" onClick={() => setExpandedSlug(null)} />}

      {/* Top bar */}
      <div className="hex-top-bar">
        <div className="hex-top-title">
          {expandedSlug ? (
            <button className="hex-back-btn" onClick={() => setExpandedSlug(null)}>← All Projects</button>
          ) : (
            <span className="hex-brand">◆ Mission Control</span>
          )}
        </div>
        {expandedSlug && (
          <button
            className={`hex-edit-toggle${editMode ? " hex-edit-toggle--active" : ""}`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "✓ Done" : "✎ Edit"}
          </button>
        )}
      </div>

      {/* Edit mode banner with Add button */}
      {editMode && expandedSlug && (
        <div className="hex-edit-banner">
          <span>EDIT MODE — Click the red <span className="hex-edit-banner__x">×</span> on any tile to hide it</span>
          <button className="hex-add-tile-btn" onClick={() => setShowAddForm(true)}>+ Add New Tile</button>
        </div>
      )}

      {/* Add tile modal */}
      {showAddForm && expandedSlug && (
        <div className="hex-add-overlay" onClick={() => setShowAddForm(false)}>
          <div className="hex-add-modal" onClick={e => e.stopPropagation()}>
            <h3>Add New Tile</h3>
            <label>Label<input value={addForm.label} onChange={e => setAddForm({ ...addForm, label: e.target.value })} placeholder="e.g. Supabase" /></label>
            <label>URL<input value={addForm.url} onChange={e => setAddForm({ ...addForm, url: e.target.value })} placeholder="https://..." /></label>
            <label>Icon type
              <select value={addForm.type} onChange={e => setAddForm({ ...addForm, type: e.target.value })}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </label>
            <div className="hex-add-modal__actions">
              <button className="hex-add-modal__cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
              <button className="hex-add-modal__save" onClick={() => submitAddForm(expandedSlug)} disabled={!addForm.label.trim() || !addForm.url.trim()}>Add Tile</button>
            </div>
          </div>
        </div>
      )}

      {/* Project grid */}
      {!expandedSlug && (
        <div className={`hex-grid ${projects.length === 1 ? "hex-grid--single" : ""}`}>
          {projects.map((project, i) => (
            <div key={project.id} className={`hex-project-cell ${project.slug === "vibepilot" || projects.length === 1 ? "hex-project-cell--center" : ""}`}>
              <button
                className={`hex-tile hex-tile--project ${project.slug === selectedSlug ? "hex-tile--selected" : ""}`}
                onClick={() => handleHexClick(project.slug)}
              >
                <span className="hex-tile__label">{project.display_name || project.slug}</span>
                <span className="hex-tile__sublabel">{project.completed_tasks ?? 0}/{project.total_tasks ?? 0} tasks</span>
                <span className={`hex-tile__status hex-tile__status--${project.status}`} />
              </button>
            </div>
          ))}
          {projects.length < 3 && (
            <div className="hex-project-cell hex-project-cell--placeholder">
              <button
                className="hex-tile hex-tile--placeholder"
                onClick={() => setShowProjectForm(true)}
              >
                <span className="hex-tile__plus">+</span>
                <span className="hex-tile__label">New Project</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Expanded view */}
      {expandedSlug && expandedProject && (
        <div className="hex-expanded">
          {/* Center tile */}
          <div className="hex-expanded-center">
            <button
              className="hex-tile hex-tile--center-expanded"
              onClick={() => onSelectProject(expandedSlug)}
            >
              {iconFor("dashboard")}
              <span className="hex-tile__label">{expandedProject.display_name}</span>
              <span className="hex-tile__sublabel">Dashboard</span>
            </button>
          </div>

          {/* Satellites */}
          {sats.map((service, i) => {
            const pos = positions[i];
            return (
              <div
                key={`${service.url}-${i}`}
                className="hex-satellite"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px)`, animationDelay: `${0.05 + i * 0.05}s` }}
              >
                {editMode && (
                  <button
                    className="hex-remove-btn"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); hideTile(expandedSlug, service.url); }}
                    title={`Hide ${service.label}`}
                  >×</button>
                )}
                <button
                  className="hex-tile hex-tile--satellite"
                  onClick={() => handleServiceClick(service)}
                  title={service.label}
                >
                  {iconFor(service.type)}
                  <span className="hex-tile__label hex-tile__label--small">{service.label}</span>
                </button>
              </div>
            );
          })}

          {/* Hidden tiles bar */}
          {editMode && hiddenList.length > 0 && (
            <div className="hex-hidden-bar">
              <span className="hex-hidden-bar__title">Hidden — click to restore:</span>
              {hiddenList.map(s => (
                <button key={s.url} className="hex-hidden-chip" onClick={() => restoreTile(expandedSlug, s.url)}>
                  {iconFor(s.type)} {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Project modal */}
      {showProjectForm && (
        <div className="hex-add-overlay" onClick={() => { setShowProjectForm(false); setProjectError(""); }}>
          <div className="hex-add-modal hex-add-modal--project" onClick={e => e.stopPropagation()}>
            <h3>Create New Project</h3>
            <label>Project Name<input value={projectForm.display_name} onChange={e => {
              const name = e.target.value;
              setProjectForm(prev => ({
                ...prev,
                display_name: name,
                slug: prev.slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
                github_repo: prev.github_repo || name.replace(/[^a-zA-Z0-9]/g, ""),
              }));
            }} placeholder="e.g. Sealed" /></label>
            <label>Slug (URL identifier)<input value={projectForm.slug} onChange={e => setProjectForm({ ...projectForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="sealed" /></label>
            <label>Description<input value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="What does this project do?" /></label>
            <label>GitHub Owner<input value={projectForm.github_owner} onChange={e => setProjectForm({ ...projectForm, github_owner: e.target.value })} placeholder="VibesTribe" /></label>
            <label>GitHub Repo Name<input value={projectForm.github_repo} onChange={e => setProjectForm({ ...projectForm, github_repo: e.target.value })} placeholder="Sealed" /></label>
            <label>Deploy Target
              <select value={projectForm.deploy_target} onChange={e => setProjectForm({ ...projectForm, deploy_target: e.target.value })}>
                <option value="vercel">Vercel</option>
                <option value="cloudflare">Cloudflare Pages</option>
                <option value="none">None (local only)</option>
              </select>
            </label>
            {projectError && <div className="hex-add-modal__error">{projectError}</div>}
            <div className="hex-add-modal__actions">
              <button className="hex-add-modal__cancel" onClick={() => { setShowProjectForm(false); setProjectError(""); }}>Cancel</button>
              <button className="hex-add-modal__save" onClick={submitProjectForm} disabled={!projectForm.slug.trim() || creating}>
                {creating ? "Creating…" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HexagonOverview;
