/**
 * ProjectIntake — PRD upload + project setup panel
 * PIF Phase H: Upload a PRD to seed kanban + knowledgebase
 */

import React, { useState, useCallback } from "react";

interface ProjectIntakeProps {
  projectSlug: string;
  onIntakeComplete?: (result: any) => void;
}

function resolveGovAPI(): string {
  if (import.meta.env.VITE_GOVERNOR_API) return import.meta.env.VITE_GOVERNOR_API;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://webhooks.vibestribe.rocks";
  }
  return "http://localhost:8080";
}

const ProjectIntake: React.FC<ProjectIntakeProps> = ({ projectSlug, onIntakeComplete }) => {
  const [expanded, setExpanded] = useState(false);
  const [prdText, setPrdText] = useState("");
  const [techStack, setTechStack] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!prdText.trim()) return;
    setSubmitting(true);
    setError("");
    const GOV_API = resolveGovAPI();
    try {
      const res = await fetch(`${GOV_API}/api/project-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: projectSlug,
          prd: prdText,
          tech_stack: techStack,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody);
      }
      const data = await res.json();
      setResult(data);
      if (onIntakeComplete) onIntakeComplete(data);
    } catch (err: any) {
      setError(err.message || "Failed to submit PRD");
    } finally {
      setSubmitting(false);
    }
  }, [prdText, techStack, projectSlug, onIntakeComplete]);

  if (!expanded && !result) {
    return (
      <div className="project-intake">
        <button className="project-intake__toggle" onClick={() => setExpanded(true)}>
          📄 Upload PRD / Blueprint
        </button>
      </div>
    );
  }

  return (
    <div className="project-intake project-intake--expanded">
      <div className="project-intake__header">
        <span className="project-intake__title">📄 Project Intake</span>
        <button className="project-intake__close" onClick={() => { setExpanded(false); setResult(null); }}>
          ✕
        </button>
      </div>

      {result ? (
        <div className="project-intake__result">
          <div className="project-intake__success">✓ Intake complete!</div>
          {(result.actions || []).map((action: any, i: number) => (
            <div key={i} className="project-intake__action">
              {action.action === "kanban_seeded"
                ? `📋 Created ${action.todo_count} kanban items`
                : action.action === "prd_saved"
                ? "📄 PRD saved to knowledgebase"
                : action.action === "tech_stack_saved"
                ? "⚙️ Tech stack saved"
                : action.action === "hermes_md_updated"
                ? "🤖 Agent context updated"
                : action.action}
            </div>
          ))}
          <button className="project-intake__done" onClick={() => { setExpanded(false); setResult(null); setPrdText(""); }}>
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="project-intake__field">
            <label>Tech Stack (optional)</label>
            <input
              type="text"
              placeholder="e.g. Go backend, Next.js frontend, Cloudflare deploy"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
          </div>
          <div className="project-intake__field">
            <label>PRD / Blueprint (paste markdown)</label>
            <textarea
              placeholder="# Project Title&#10;&#10;## Overview&#10;Description...&#10;&#10;## Features&#10;- Feature 1&#10;- Feature 2"
              value={prdText}
              onChange={(e) => setPrdText(e.target.value)}
              rows={10}
            />
          </div>
          {error && <div className="project-intake__error">{error}</div>}
          <div className="project-intake__actions">
            <button
              className="project-intake__submit"
              onClick={handleSubmit}
              disabled={!prdText.trim() || submitting}
            >
              {submitting ? "Processing..." : "Parse & Seed Project"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectIntake;
