import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

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

// ─── Icon system (inline SVG for each service type) ────────────────────────

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  github: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.2 3.44 9.61 8.21 11.16.6.11.82-.25.82-.56v-2.02c-3.34.71-4.04-1.58-4.04-1.58-.55-1.37-1.34-1.74-1.34-1.74-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.21 1.84 1.21 1.07 1.8 2.81 1.28 3.5.98.11-.76.42-1.28.76-1.57-2.67-.3-5.47-1.31-5.47-5.82 0-1.29.47-2.34 1.24-3.17-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.21a11.6 11.6 0 0 1 3-.4c1.02 0 2.05.14 3 .4 2.29-1.53 3.3-1.21 3.3-1.21.66 1.66.25 2.88.12 3.18.77.83 1.24 1.88 1.24 3.17 0 4.52-2.81 5.52-5.49 5.81.43.36.81 1.08.81 2.18v3.24c0 .31.22.68.83.56A12.01 12.01 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
    </svg>
  ),
  vercel: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M12 2L2 19.5h20L12 2z" />
    </svg>
  ),
  cloudflare: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M16.3 13.4c.1-.4 0-.9-.3-1.2l-2-2.4c-.2-.2-.5-.4-.8-.4H8.3c-.3 0-.6.1-.8.4l-2 2.4c-.3.3-.4.8-.3 1.2L5.5 16c.1.5.5.8 1 .8h2.9c.3 0 .5-.1.7-.3l.3-.3.3.3c.2.2.4.3.7.3h2.9c.5 0 .9-.3 1-.8l1.1-2.6z" />
    </svg>
  ),
  openrouter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" />
    </svg>
  ),
  google: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.6c2.1-1.9 3.2-4.8 3.2-8.1z" />
      <path d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.8c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.9C4.1 20.7 7.8 23 12 23z" />
      <path d="M6 14.3c-.2-.7-.4-1.4-.4-2.3s.1-1.6.4-2.3V6.8H2.3C1.4 8.4 1 10.1 1 12s.4 3.6 1.3 5.2L6 14.3z" />
      <path d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1C17.4 2.1 14.9 1 12 1 7.8 1 4.1 3.3 2.3 6.8L6 9.7c.9-2.5 3.2-4.3 6-4.3z" />
    </svg>
  ),
  groq: (
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path d="M13 2L4.5 12.5h6.5l-1.5 9L18.5 11H12l1-9z" />
    </svg>
  ),
  zai: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <path d="M4 4h16L8 20h12" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
};

function iconFor(type: string): React.ReactNode {
  return SERVICE_ICONS[type] || SERVICE_ICONS.default;
}

// ─── Service icon labels for the edit mode ─────────────────────────────────

const SERVICE_TYPES = [
  "dashboard", "github", "vercel", "cloudflare", "openrouter",
  "google", "groq", "default",
];

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
  const [draggedService, setDraggedService] = useState<{ projectSlug: string; index: number } | null>(null);
  const [customServices, setCustomServices] = useState<Record<string, ConnectedService[]>>({});
  const [hiddenServices, setHiddenServices] = useState<Record<string, string[]>>({}); // key: slug -> array of URLs hidden

  // ─── Fetch projects ──────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${GOV_API}/api/projects`);
      if (!res.ok) return;
      const data = await res.json();
      // If the API doesn't include connected_services (pre-restart),
      // fetch them individually from the dashboard endpoint
      const projectsWithServices = await Promise.all(
        data.map(async (p: ProjectInfo) => {
          if (p.connected_services && p.connected_services.length > 0) {
            return p;
          }
          // Fallback: fetch from dashboard endpoint which includes project details
          try {
            const dashRes = await fetch(`${GOV_API}/api/dashboard?project=${p.slug}`);
            if (dashRes.ok) {
              const dashData = await dashRes.json();
              if (dashData.project?.connected_services) {
                return { ...p, connected_services: dashData.project.connected_services };
              }
            }
          } catch {}
          // Last resort: hardcode known services for vibepilot
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
              ] as ConnectedService[],
            };
          }
          return p;
        })
      );
      setProjects(projectsWithServices);
      // Load any locally saved custom services and hidden services
      const savedCustom = localStorage.getItem("vp_custom_services");
      if (savedCustom) setCustomServices(JSON.parse(savedCustom));
      const savedHidden = localStorage.getItem("vp_hidden_services");
      if (savedHidden) setHiddenServices(JSON.parse(savedHidden));
    } catch {
      // offline — use cached data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  // Persist custom and hidden services
  useEffect(() => {
    localStorage.setItem("vp_custom_services", JSON.stringify(customServices));
  }, [customServices]);

  useEffect(() => {
    localStorage.setItem("vp_hidden_services", JSON.stringify(hiddenServices));
  }, [hiddenServices]);

  // ─── Get visible services for a project (DB + custom, minus hidden) ───────

  const getServices = useCallback((slug: string): ConnectedService[] => {
    const project = projects.find(p => p.slug === slug);
    const dbServices = project?.connected_services || [];
    const local = customServices[slug] || [];
    const hidden = hiddenServices[slug] || [];
    // Merge: DB services + local custom services, dedup by URL, filter out hidden
    const seen = new Set<string>();
    const merged = [...dbServices, ...local]
      .filter(s => !hidden.includes(s.url))
      .filter(s => {
        const key = s.url || s.label;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return merged;
  }, [projects, customServices, hiddenServices]);

  // ─── Edit mode handlers ──────────────────────────────────────────────────

  const addService = useCallback((slug: string) => {
    const url = prompt("Enter URL:");
    if (!url) return;
    const label = prompt("Label:", "New Link") || "Link";
    const type = prompt("Icon type (github/vercel/cloudflare/openrouter/google/groq/default):", "default") || "default";
    setCustomServices(prev => ({
      ...prev,
      [slug]: [...(prev[slug] || []), { url, label, type }],
    }));
  }, []);

  // ─── Hide/remove a service tile (localStorage-based, works for all tiles) ─

  const removeService = useCallback((slug: string, serviceIndex: number) => {
    // Get the full visible list and find the URL at this index
    const project = projects.find(p => p.slug === slug);
    const dbServices = project?.connected_services || [];
    const localServices = customServices[slug] || [];
    const hidden = hiddenServices[slug] || [];
    // Rebuild visible list (same logic as getServices)
    const seen = new Set<string>();
    const visible = [...dbServices, ...localServices]
      .filter(s => !hidden.includes(s.url))
      .filter(s => {
        const key = s.url || s.label;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const target = visible[serviceIndex];
    if (!target) return;

    // Add URL to hidden list
    setHiddenServices(prev => ({
      ...prev,
      [slug]: [...(prev[slug] || []), target.url],
    }));
  }, [projects, customServices, hiddenServices]);

  // ─── Restore a hidden tile ─────────────────────────────────────────────────

  const restoreService = useCallback((slug: string, url: string) => {
    setHiddenServices(prev => ({
      ...prev,
      [slug]: (prev[slug] || []).filter(u => u !== url),
    }));
  }, []);

  const handleServiceDragStart = useCallback((projectSlug: string, index: number) => {
    setDraggedService({ projectSlug, index });
  }, []);

  const handleServiceDrop = useCallback((targetSlug: string, targetIndex: number) => {
    if (!draggedService || draggedService.projectSlug !== targetSlug) return;
    const services = getServices(targetSlug);
    const newArr = [...services];
    const [moved] = newArr.splice(draggedService.index, 1);
    newArr.splice(targetIndex, 0, moved);
    // Update local storage (both DB + custom)
    const project = projects.find(p => p.slug === targetSlug);
    const dbCount = project?.connected_services?.length || 0;
    const dbPart = newArr.slice(0, dbCount);
    const localPart = newArr.slice(dbCount);
    // Save reordered local part
    setCustomServices(prev => ({ ...prev, [targetSlug]: localPart }));
    // Save reordered DB part via API
    fetch(`${GOV_API}/api/projects/${targetSlug}/services`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connected_services: dbPart }),
    }).then(() => fetchProjects()).catch(() => {});
    setDraggedService(null);
  }, [draggedService, getServices, projects, fetchProjects]);

  // ─── Hexagon click handler ───────────────────────────────────────────────

  const handleHexClick = useCallback((slug: string) => {
    if (expandedSlug === slug) {
      // Already expanded — clicking center goes to dashboard
      onSelectProject(slug);
    } else {
      setExpandedSlug(slug);
    }
  }, [expandedSlug, onSelectProject]);

  // ─── Service click handler ───────────────────────────────────────────────

  const handleServiceClick = useCallback((service: ConnectedService) => {
    if (service.type === "dashboard") {
      // Dashboard link — navigate within the app
      if (expandedSlug) onSelectProject(expandedSlug);
      return;
    }
    // External link — open in new tab
    window.open(service.url, "_blank", "noopener,noreferrer");
  }, [expandedSlug, onSelectProject]);

  // ─── Layout positions for satellites around a center hexagon ─────────────

  function getSatellitePositions(count: number) {
    // Spread satellites evenly around a circle.
    // Tighter radius for a compact hex cluster.
    const baseRadius = 160;
    const radius = Math.max(baseRadius, 130 + count * 8);
    const positions = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI - Math.PI / 2; // start at top
      positions.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return positions;
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="hex-loading">
        <div className="hex-pulse-ring" />
        <span>Loading projects…</span>
      </div>
    );
  }

  const expandedProject = expandedSlug ? projects.find(p => p.slug === expandedSlug) : null;
  const expandedServices = expandedSlug ? getServices(expandedSlug) : [];

  // Make sure dashboard is always the center of expanded view
  const servicesWithDashboard: ConnectedService[] = expandedSlug ? [
    { url: "", type: "dashboard", label: "Dashboard" },
    ...expandedServices,
  ] : [];

  return (
    <div className="hexagon-overview">
      {/* Backdrop when a project is expanded */}
      {expandedSlug && (
        <div className="hex-backdrop" onClick={() => setExpandedSlug(null)} />
      )}

      {/* Top bar */}
      <div className="hex-top-bar">
        <div className="hex-top-title">
          {expandedSlug ? (
            <button className="hex-back-btn" onClick={() => setExpandedSlug(null)}>
              ← All Projects
            </button>
          ) : (
            <span className="hex-brand">◆ Mission Control</span>
          )}
        </div>
        <button
          className={`hex-edit-toggle${editMode ? " hex-edit-toggle--active" : ""}`}
          onClick={() => setEditMode(!editMode)}
          title={editMode ? "Exit edit mode" : "Edit services"}
        >
          {editMode ? "✓ Done" : "✎ Edit"}
        </button>
      </div>

      {/* Project hexagon grid (overview) */}
      {!expandedSlug && (
        <div className={`hex-grid ${projects.length === 1 ? "hex-grid--single" : ""}`}>
          {projects.map((project, i) => {
            const isCenter = project.slug === "vibepilot" || projects.length === 1;
            const isSelected = project.slug === selectedSlug;
            return (
              <div
                key={project.id}
                className={`hex-project-cell ${isCenter ? "hex-project-cell--center" : ""}`}
                style={{ "--cell-index": i } as React.CSSProperties}
              >
                <button
                  className={`hex-tile hex-tile--project ${isSelected ? "hex-tile--selected" : ""}`}
                  onClick={() => handleHexClick(project.slug)}
                  title={project.description || project.display_name}
                >
                  <span className="hex-tile__label">{project.display_name || project.slug}</span>
                  <span className="hex-tile__sublabel">
                    {project.completed_tasks ?? 0}/{project.total_tasks ?? 0} tasks
                  </span>
                  <span className={`hex-tile__status hex-tile__status--${project.status}`} />
                </button>
              </div>
            );
          })}

          {/* Placeholder for future projects */}
          {projects.length < 2 && (
            <div className="hex-project-cell hex-project-cell--placeholder">
              <div className="hex-tile hex-tile--placeholder">
                <span className="hex-tile__plus">+</span>
                <span className="hex-tile__label">New Project</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded project view with satellite services */}
      {expandedSlug && expandedProject && (
        <div className="hex-expanded">
          {/* Center: project dashboard tile */}
          <div className="hex-expanded-center">
            <button
              className={`hex-tile hex-tile--center-expanded ${selectedSlug === expandedSlug ? "hex-tile--selected" : ""}`}
              onClick={() => onSelectProject(expandedSlug)}
              title="Open dashboard"
            >
              {iconFor("dashboard")}
              <span className="hex-tile__label">{expandedProject.display_name}</span>
              <span className="hex-tile__sublabel">Dashboard</span>
            </button>
          </div>

          {/* Satellite service hexagons */}
          {(() => {
            const sats = servicesWithDashboard.slice(1);
            const positions = getSatellitePositions(sats.length);
            return sats.map((service, i) => {
              const pos = positions[i];
              return (
                <div
                  key={`${service.url}-${i}`}
                  className="hex-satellite"
                  style={{
                    transform: `translate(${pos.x}px, ${pos.y}px)`,
                    animationDelay: `${0.05 + i * 0.05}s`,
                  }}
                >
                  {editMode && (
                    <button
                      className="hex-remove-btn"
                      onClick={(e) => { e.stopPropagation(); removeService(expandedSlug, i); }}
                      title="Remove"
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
            });
          })()}

          {/* Add button in edit mode */}
          {editMode && (
            (() => {
              const addPos = getSatellitePositions(servicesWithDashboard.length)[servicesWithDashboard.length - 1];
              return (
                <div
                  className="hex-satellite hex-satellite--add"
                  style={{
                    transform: `translate(${addPos ? `${addPos.x}px, ${addPos.y}px` : "0, 0"})`,
                  }}
                >
                  <button
                    className="hex-tile hex-tile--add"
                    onClick={() => addService(expandedSlug)}
                    title="Add service link"
                  >
                    <span className="hex-tile__plus">+</span>
                    <span className="hex-tile__label hex-tile__label--small">Add</span>
                  </button>
                </div>
              );
            })()
          )}

          {/* Hidden tiles restore bar (edit mode only) */}
          {editMode && (() => {
            const project = projects.find(p => p.slug === expandedSlug);
            const dbServices = project?.connected_services || [];
            const local = customServices[expandedSlug] || [];
            const hidden = hiddenServices[expandedSlug] || [];
            const hiddenTiles = [...dbServices, ...local].filter(s => hidden.includes(s.url));
            if (hiddenTiles.length === 0) return null;
            return (
              <div className="hex-hidden-bar">
                <span className="hex-hidden-bar__title">Hidden tiles — click to restore:</span>
                {hiddenTiles.map(s => (
                  <button
                    key={s.url}
                    className="hex-hidden-chip"
                    onClick={() => restoreService(expandedSlug, s.url)}
                    title={`Restore ${s.label}`}
                  >
                    {iconFor(s.type)} {s.label}
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default HexagonOverview;
