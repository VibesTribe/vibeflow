import React, { useState, useEffect, useCallback } from "react";

const API_BASE = window.location.hostname === "localhost"
  ? "http://localhost:8080"
  : "https://webhooks.vibestribe.rocks";

type DesignPreview = {
  id: string;
  task_id: string;
  status: string;
  prompt: string;
  html_content: string;
  file_path: string;
  reviewer: string;
  review_notes: string;
  version: number;
  created_at: string;
  reviewed_at: string | null;
};

type DesignSubTab = "gallery" | "sketch" | "codesign" | "storybook" | "verify";

export default function DesignHub() {
  const [subTab, setSubTab] = useState<DesignSubTab>("gallery");
  const [previews, setPreviews] = useState<DesignPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPreview, setSelectedPreview] = useState<DesignPreview | null>(null);
  const [sketchPrompt, setSketchPrompt] = useState("");
  const [sketchHtml, setSketchHtml] = useState<string | null>(null);
  const [sketchGenerating, setSketchGenerating] = useState(false);

  const loadPreviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/design-preview/list`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setPreviews(Array.isArray(data) ? data : data.previews || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load designs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreviews();
  }, [loadPreviews]);

  const handleGenerateSketch = async () => {
    if (!sketchPrompt.trim()) return;
    setSketchGenerating(true);
    setSketchHtml(null);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90000);
      const res = await fetch(`${API_BASE}/api/design-preview/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: `sketch-${Date.now()}`,
          title: sketchPrompt.slice(0, 100),
          description: sketchPrompt,
          design_hints: "dark theme, modern dashboard",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }
      const data = await res.json();
      if (data.html_content) {
        setSketchHtml(data.html_content);
      } else {
        throw new Error("No HTML content in response");
      }
    } catch (e: any) {
      if (e.name === "AbortError") {
        setError("Sketch generation timed out after 90 seconds. The Gemini API may be rate limited.");
      } else {
        setError(e.message || "Sketch generation failed");
      }
    } finally {
      setSketchGenerating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/design-preview/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview_id: id, reviewer: "dashboard" }),
      });
      loadPreviews();
      setSelectedPreview(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/design-preview/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview_id: id, reviewer: "dashboard" }),
      });
      loadPreviews();
      setSelectedPreview(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const SUB_TABS: { key: DesignSubTab; label: string }[] = [
    { key: "gallery", label: "Gallery" },
    { key: "sketch", label: "New Sketch" },
    { key: "codesign", label: "CoDesign" },
    { key: "storybook", label: "Storybook" },
    { key: "verify", label: "Verify" },
  ];

  const cardStyle: React.CSSProperties = {
    background: "#0d1117",
    border: "1px solid #30363d",
    borderRadius: 8,
    padding: 16,
  };

  const btnPrimary: React.CSSProperties = {
    padding: "8px 16px",
    background: "#238636",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  };

  const btnGhost: React.CSSProperties = {
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid #30363d",
    borderRadius: 6,
    color: "#c9d1d9",
    fontSize: 13,
    cursor: "pointer",
  };

  const btnDanger: React.CSSProperties = {
    padding: "8px 16px",
    background: "#da3633",
    border: "none",
    borderRadius: 6,
    color: "#fff",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": return "#3fb950";
      case "rejected": return "#f85149";
      case "pending_approval": return "#d29922";
      default: return "#9da5af";
    }
  };

  const renderGallery = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <div style={{ padding: "10px 14px", background: "#3d1f1f", borderRadius: 6, color: "#f85149", fontSize: 13 }}>
          {error}
        </div>
      )}
      {loading ? (
        <div style={{ textAlign: "center", padding: 24, color: "#9da5af" }}>
          Loading design gallery...
        </div>
      ) : previews.length === 0 ? (
        <div style={cardStyle}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>&#9998;</div>
            <div style={{ color: "#c9d1d9", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No designs yet</div>
            <div style={{ color: "#9da5af", fontSize: 13, marginBottom: 16 }}>
              Ask the consultant agent to create a design sketch, or use the New Sketch tab.
            </div>
            <button onClick={() => setSubTab("sketch")} style={btnPrimary}>
              Create First Sketch
            </button>
          </div>
        </div>
      ) : (
        previews.map((p) => (
          <div key={p.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
                  {p.prompt.slice(0, 80)}{p.prompt.length > 80 ? "..." : ""}
                </div>
                <div style={{ color: "#9da5af", fontSize: 12, marginTop: 4 }}>
                  {new Date(p.created_at).toLocaleDateString()} v{p.version}
                </div>
              </div>
              <span style={{
                padding: "4px 10px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                background: `${statusColor(p.status)}22`,
                color: statusColor(p.status),
                border: `1px solid ${statusColor(p.status)}44`,
              }}>
                {p.status.replace("_", " ")}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelectedPreview(p)} style={btnGhost}>Preview</button>
              {p.status === "pending_approval" && (
                <>
                  <button onClick={() => handleApprove(p.id)} style={btnPrimary}>Approve</button>
                  <button onClick={() => handleReject(p.id)} style={btnDanger}>Reject</button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSketch = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {error && (
        <div style={{ padding: "10px 14px", background: "#3d1f1f", borderRadius: 6, color: "#f85149", fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={cardStyle}>
        <label style={{ color: "#c9d1d9", fontSize: 13, display: "block", marginBottom: 8 }}>
          Describe the UI you want to build
        </label>
        <textarea
          value={sketchPrompt}
          onChange={(e) => setSketchPrompt(e.target.value)}
          placeholder="Example: A settings page with dark theme, card layout, with toggles for notifications, API keys section with masked inputs, and a save button at the bottom"
          style={{
            width: "100%",
            minHeight: 100,
            padding: "10px 14px",
            background: "#0d1117",
            border: "1px solid #30363d",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 14,
            resize: "vertical",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={handleGenerateSketch}
            disabled={sketchGenerating || !sketchPrompt.trim()}
            style={{
              ...btnPrimary,
              opacity: sketchGenerating || !sketchPrompt.trim() ? 0.5 : 1,
            }}
          >
            {sketchGenerating ? "Generating..." : "Generate Sketch"}
          </button>
          <button onClick={() => { setSketchPrompt(""); setSketchHtml(null); }} style={btnGhost}>Clear</button>
        </div>
      </div>
      {sketchHtml && (
        <div style={{
          border: "1px solid #30363d",
          borderRadius: 8,
          overflow: "hidden",
          background: "#0d1117",
        }}>
          <div style={{
            padding: "8px 14px",
            borderBottom: "1px solid #30363d",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ color: "#9da5af", fontSize: 12 }}>Preview</span>
            <button
              onClick={() => {
                const w = window.open("", "_blank");
                if (w) { w.document.write(sketchHtml); w.document.close(); }
              }}
              style={{ ...btnGhost, padding: "4px 10px", fontSize: 11 }}
            >
              Open Fullscreen
            </button>
          </div>
          <iframe
            srcDoc={sketchHtml}
            style={{ width: "100%", height: 500, border: "none", background: "#0a0a0a" }}
            title="Design Sketch Preview"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );

  const renderCodesign = () => (
    <div style={cardStyle}>
      <div style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>&#127912;</div>
        <div style={{ color: "#c9d1d9", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>OpenCoDesign</div>
        <div style={{ color: "#9da5af", fontSize: 13, marginBottom: 16 }}>
          Collaborative design refinement. Select a sketch from the Gallery, then iterate on it together with the AI agent.
          Coming soon.
        </div>
      </div>
    </div>
  );

  const renderStorybook = () => (
    <div style={cardStyle}>
      <div style={{ textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>&#128218;</div>
        <div style={{ color: "#c9d1d9", fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Component Storybook</div>
        <div style={{ color: "#9da5af", fontSize: 13, marginBottom: 16 }}>
          Browse and test dashboard components in isolation. Storybook will be served from the server and embedded here.
          Coming soon.
        </div>
      </div>
    </div>
  );

  const renderVerify = () => (
    <div style={{ color: "#9da5af", fontSize: 13, textAlign: "center", padding: 16 }}>
      Visual QA runs are shown below. Trigger a new run to verify the current dashboard design.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Sub-tab navigation */}
      <div style={{
        display: "flex",
        gap: 4,
        borderBottom: "1px solid #30363d",
        paddingBottom: 8,
        overflowX: "auto",
      }}>
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              padding: "6px 14px",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: subTab === t.key ? 600 : 400,
              cursor: "pointer",
              background: subTab === t.key ? "#238636" : "transparent",
              color: subTab === t.key ? "#ffffff" : "#9da5af",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {subTab === "gallery" && renderGallery()}
      {subTab === "sketch" && renderSketch()}
      {subTab === "codesign" && renderCodesign()}
      {subTab === "storybook" && renderStorybook()}
      {subTab === "verify" && renderVerify()}

      {/* Full-screen preview modal */}
      {selectedPreview && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: 20,
        }}>
          <div style={{
            width: "100%",
            maxWidth: 900,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 12,
            overflow: "hidden",
          }}>
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid #30363d",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
                  Design Preview
                </div>
                <div style={{ color: "#9da5af", fontSize: 12 }}>
                  {selectedPreview.status.replace("_", " ")} v{selectedPreview.version}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {selectedPreview.status === "pending_approval" && (
                  <>
                    <button onClick={() => handleApprove(selectedPreview.id)} style={btnPrimary}>Approve</button>
                    <button onClick={() => handleReject(selectedPreview.id)} style={btnDanger}>Reject</button>
                  </>
                )}
                <button onClick={() => setSelectedPreview(null)} style={btnGhost}>Close</button>
              </div>
            </div>
            <iframe
              srcDoc={selectedPreview.html_content}
              style={{ width: "100%", flex: 1, border: "none", minHeight: 500, background: "#0a0a0a" }}
              title="Design Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}
