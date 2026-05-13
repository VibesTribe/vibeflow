import React, { useCallback, useEffect, useState } from "react";

type VqaIssue = {
  type: string;
  severity: string;
  description: string;
  element: string;
  viewport: number;
  pattern_key?: string;
};

type VqaPageResult = {
  page_name: string;
  viewport: number;
  passed: boolean;
  summary: string;
  issues?: VqaIssue[];
  url?: string;
};

type VqaRun = {
  id: string;
  triggered_by: string;
  status: string;
  pages_checked: number;
  pages_passed: number;
  pages_failed: number;
  results?: VqaPageResult[];
  started_at: string;
  error_message?: string;
};

type FeedbackVerdict = "confirmed" | "false_positive" | "wont_fix";

const VQA_API = window.location.hostname === "localhost"
  ? "http://localhost:8080"
  : "https://webhooks.vibestribe.rocks";

export default function VqaPanel({ onClose, inline }: { onClose: () => void; inline?: boolean }) {
  const [runs, setRuns] = useState<VqaRun[]>([]);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [feedbackStates, setFeedbackStates] = useState<Record<string, FeedbackVerdict | null>>({});
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(VQA_API + "/api/visualqa/status");
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setRuns(Array.isArray(data) ? data : data.results || []);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Failed to load VQA runs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRuns();
    const interval = setInterval(loadRuns, 15000);
    return () => clearInterval(interval);
  }, [loadRuns]);

  const triggerRun = async () => {
    try {
      setTriggering(true);
      await fetch(VQA_API + "/api/visualqa/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual", detail: "dashboard" }),
      });
      setTimeout(loadRuns, 3000);
    } catch (e: any) {
      setError(e.message || "Failed to trigger run");
    } finally {
      setTriggering(false);
    }
  };

  const submitFeedback = async (
    runId: string,
    issue: VqaIssue,
    verdict: FeedbackVerdict
  ) => {
    const key = `${runId}:${issue.type}:${issue.element}:${issue.viewport}`;
    try {
      const res = await fetch(VQA_API + "/api/visualqa/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: runId,
          issue_type: issue.type,
          issue_element: issue.element,
          issue_description: issue.description,
          viewport: issue.viewport,
          verdict,
          pattern_key: issue.pattern_key || `${issue.type}:${issue.element}`,
        }),
      });
      if (res.ok) {
        setFeedbackStates((prev) => ({ ...prev, [key]: verdict }));
      }
    } catch (e) {
      console.error("Feedback submission failed:", e);
    }
  };

  const approveBaseline = async (pageName: string, viewport: number) => {
    await fetch(VQA_API + "/api/visualqa/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page_name: pageName, viewport }),
    });
  };

  const header = (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px",
      }}
    >
      <h2 style={{ margin: 0, color: "var(--color-text-primary)" }}>
        Visual QA Agent
      </h2>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={triggerRun}
          disabled={triggering}
          style={{
            padding: "6px 16px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            background: "var(--color-accent-primary)",
            color: "var(--color-text-on-accent)",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            opacity: triggering ? 0.6 : 1,
          }}
        >
          {triggering ? "Running..." : "Run Now"}
        </button>
        <button
          onClick={onClose}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "999px",
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-elevated)",
            color: "var(--color-text-primary)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: "16px",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );

  const content = (
    <>
      {loading && runs.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          Loading runs...
        </div>
      )}
      {!loading && runs.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--color-text-muted)" }}>
          No VQA runs yet. Click "Run Now" to start.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {runs.map((run) => {
          const isExpanded = expandedRun === run.id;
          const results: VqaPageResult[] = run.results || [];
          const failedPages = results.filter((p) => !p.passed);

          return (
            <div key={run.id} style={{ background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden" }}>
              <div onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                <div>
                  <div style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: "14px" }}>
                    {run.triggered_by || "unknown"} <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>— {run.status}</span>
                  </div>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "12px", marginTop: "2px" }}>
                    {run.started_at ? new Date(run.started_at).toLocaleString() : "unknown time"} — {run.pages_checked} pages,{" "}
                    <span style={{ color: "var(--status-success)" }}>{run.pages_passed} passed</span>,{" "}
                    <span style={{ color: "var(--status-error)" }}>{run.pages_failed} failed</span>
                  </div>
                </div>
                <span style={{ color: "var(--color-text-muted)", fontSize: "18px", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
              </div>
              {isExpanded && (
                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {failedPages.length === 0 && (
                    <div style={{ padding: "12px", background: "rgba(34,197,94,0.1)", borderRadius: "8px", color: "var(--status-success)", fontSize: "13px", textAlign: "center" }}>
                      All pages passed!
                    </div>
                  )}
                  {results.map((page) => {
                    const pageKey = `${run.id}:${page.page_name}:${page.viewport}`;
                    const isPageExpanded = expandedPage === pageKey;
                    const issues: VqaIssue[] = page.issues || [];
                    return (
                      <div key={pageKey} style={{ background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border)", borderRadius: "8px", overflow: "hidden" }}>
                        <div onClick={() => setExpandedPage(isPageExpanded ? null : pageKey)}
                          style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: page.passed ? "var(--status-success)" : "var(--status-error)", display: "inline-block" }} />
                            <span style={{ color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 500 }}>{page.page_name}</span>
                            <span style={{ color: "var(--color-text-muted)", fontSize: "11px" }}>{page.viewport}px</span>
                          </div>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                            {!page.passed && (
                              <button onClick={(e) => { e.stopPropagation(); approveBaseline(page.page_name, page.viewport); }}
                                style={{ padding: "2px 10px", borderRadius: "6px", border: "1px solid var(--color-border)", background: "rgba(34,197,94,0.15)", color: "var(--status-success)", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}>
                                Approve
                              </button>
                            )}
                            <span style={{ color: "var(--color-text-muted)", fontSize: "14px", transition: "transform 0.2s", transform: isPageExpanded ? "rotate(180deg)" : "none" }}>▼</span>
                          </div>
                        </div>
                        {isPageExpanded && (
                          <div style={{ padding: "8px 12px 12px", borderTop: "1px solid var(--color-border)" }}>
                            {page.summary && <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "8px" }}>{page.summary}</div>}
                            {issues.length === 0 && <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center", padding: "8px" }}>No issues</div>}
                            {issues.map((issue, idx) => {
                              const feedbackKey = `${run.id}:${issue.type}:${issue.element}:${issue.viewport}`;
                              const currentVerdict = feedbackStates[feedbackKey];
                              return (
                                <div key={idx} style={{ padding: "8px 10px", marginBottom: "4px", background: "var(--color-bg-primary)", borderRadius: "6px", border: "1px solid var(--color-border)", fontSize: "12px" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <span style={{ display: "inline-block", padding: "1px 6px", borderRadius: "4px", fontSize: "10px", fontWeight: 600, textTransform: "uppercase",
                                        background: issue.severity === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)",
                                        color: issue.severity === "critical" ? "var(--status-error)" : "var(--status-warning)", marginRight: "6px" }}>
                                        {issue.severity}
                                      </span>
                                      <span style={{ color: "var(--color-text-tertiary)", fontSize: "11px" }}>{issue.type}</span>
                                      <div style={{ marginTop: "4px", color: "var(--color-text-primary)", lineHeight: 1.4 }}>{issue.description}</div>
                                      {issue.element && <div style={{ marginTop: "2px", color: "var(--color-text-muted)", fontSize: "11px", fontFamily: "monospace" }}>{issue.element}</div>}
                                    </div>
                                  </div>
                                  {!currentVerdict && (
                                    <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                                      {(["confirmed", "false_positive", "wont_fix"] as FeedbackVerdict[]).map((v) => (
                                        <button key={v} onClick={() => submitFeedback(run.id, issue, v)}
                                          style={{ padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--color-border)",
                                            background: v === "confirmed" ? "rgba(239,68,68,0.15)" : v === "false_positive" ? "rgba(34,197,94,0.15)" : "rgba(148,163,184,0.15)",
                                            color: v === "confirmed" ? "var(--status-error)" : v === "false_positive" ? "var(--status-success)" : "var(--color-text-muted)",
                                            cursor: "pointer", fontSize: "10px", fontWeight: 600 }}>
                                          {v.replace("_", " ")}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {currentVerdict && (
                                    <div style={{ marginTop: "6px", fontSize: "11px", fontWeight: 600,
                                      color: currentVerdict === "confirmed" ? "var(--status-error)" : currentVerdict === "false_positive" ? "var(--status-success)" : "var(--color-text-muted)" }}>
                                      Marked as: {currentVerdict.replace("_", " ")}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {run.error_message && (
                    <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: "6px", color: "var(--status-error)", fontSize: "12px" }}>
                      Error: {run.error_message}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  if (inline) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, color: "var(--color-text-primary)", fontSize: "16px" }}>
            Visual QA Runs
          </h3>
          <button onClick={triggerRun} disabled={triggering}
            style={{
              padding: "6px 16px", borderRadius: "8px", border: "1px solid var(--color-border)",
              background: "var(--color-accent-primary)", color: "var(--color-text-on-accent)",
              cursor: "pointer", fontSize: "13px", fontWeight: 600, opacity: triggering ? 0.6 : 1,
            }}>
            {triggering ? "Running..." : "Run Now"}
          </button>
        </div>
        {error && <div style={{ padding: "8px", background: "rgba(239,68,68,0.1)", borderRadius: "6px", color: "var(--status-error)", fontSize: "12px" }}>{error}</div>}
        {content}
      </div>
    );
  }

  return (
    <div className="mission-modal__overlay" onClick={onClose}>
      <div className="mission-modal" onClick={(e) => e.stopPropagation()}
        style={{ width: "90%", maxWidth: "900px", maxHeight: "85vh", overflow: "auto", padding: "24px" }}>
        {header}
        {error && (
          <div style={{ padding: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid var(--status-error)", borderRadius: "8px", color: "var(--status-error)", marginBottom: "16px", fontSize: "13px" }}>
            {error}
          </div>
        )}
        {content}
      </div>
    </div>
  );
}
