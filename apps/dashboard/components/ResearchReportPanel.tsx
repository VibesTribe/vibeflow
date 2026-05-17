import React, { useCallback, useEffect, useState } from "react";

interface ReportItem {
  id: string;
  title: string;
  summary: string;
  finding_type: string;
  council_recommendation: string;
  council_reasoning: string;
  council_concerns: string[];
  human_decision: string | null;
  human_notes: string | null;
  sort_order: number;
}

interface Report {
  id: string;
  title: string;
  report_type: string;
  status: string;
  findings_path: string;
  decision_doc_path: string;
  council_notes: Record<string, unknown>;
  items: ReportItem[];
  is_raw_suggestion?: boolean;
  summary?: string;
  details?: Record<string, unknown>;
  complexity?: string;
}

interface ResearchReportPanelProps {
  reportId: string;
  onClose: () => void;
}

const govAPI =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://webhooks.vibestribe.rocks"
    : "http://localhost:8080";

const REC_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  approve: { bg: "#34d39922", border: "#34d39955", text: "#34d399" },
  watch:   { bg: "#fbbf2422", border: "#fbbf2455", text: "#fbbf24" },
  reject:  { bg: "#f8717122", border: "#f8717155", text: "#f87171" },
};

const DECISION_ICONS: Record<string, string> = {
  approve: "✓ Approve",
  watch:   "👁 Watch",
  reject:  "✗ Reject",
};

const COMPLEXITY_COLORS: Record<string, { bg: string; text: string }> = {
  simple: { bg: "#34d39922", text: "#34d399" },
  complex: { bg: "#fbbf2422", text: "#fbbf24" },
  human: { bg: "#f8717122", text: "#f87171" },
};

const ResearchReportPanel: React.FC<ResearchReportPanelProps> = ({ reportId, onClose }) => {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchReport = useCallback(() => {
    fetch(`${govAPI}/api/research-reports/${reportId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleDecision = async (itemId: string, decision: string) => {
    setUpdating(itemId);
    try {
      const res = await fetch(`${govAPI}/api/report-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        fetchReport();
      }
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", color: "#94a3b8", textAlign: "center" }}>
        Loading report...
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: "24px", color: "#f87171", textAlign: "center" }}>
        Failed to load report.
        <button onClick={onClose} style={{ display: "block", margin: "12px auto", color: "#94a3b8", background: "none", border: "1px solid #475569", padding: "6px 16px", borderRadius: "4px", cursor: "pointer" }}>
          Close
        </button>
      </div>
    );
  }

  // Raw suggestion view (not yet compiled into a council report)
  if (report.is_raw_suggestion) {
    const cStyle = report.complexity ? COMPLEXITY_COLORS[report.complexity] : null;
    return (
      <div style={{ padding: "16px", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>{report.title}</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Pending council review</span>
              {cStyle && (
                <span style={{ fontSize: "0.6rem", padding: "1px 8px", borderRadius: "10px", background: cStyle.bg, color: cStyle.text, fontWeight: 600 }}>
                  {report.complexity}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }} aria-label="Close">
            ×
          </button>
        </div>

        {report.summary && (
          <p style={{ margin: "0 0 12px", fontSize: "0.8rem", color: "#94a3b8", lineHeight: "1.5" }}>
            {report.summary}
          </p>
        )}

        {report.details && (
          <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "12px", marginBottom: "12px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Details</h4>
            <pre style={{ margin: 0, fontSize: "0.7rem", color: "#cbd5e1", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(report.details, null, 2)}
            </pre>
          </div>
        )}

        {report.findings_path && (
          <a
            href={`https://knowledge.vibestribe.rocks/${report.findings_path}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-block", fontSize: "0.75rem", color: "#60a5fa", textDecoration: "underline" }}
          >
            View findings document →
          </a>
        )}
      </div>
    );
  }

  // Compiled report view (council-reviewed)
  const items = report.items || [];
  const decidedCount = items.filter((i) => i.human_decision).length;
  const allDecided = decidedCount === items.length;
  const approvedCount = items.filter((i) => i.human_decision === "approve").length;

  return (
    <div style={{ padding: "16px", maxHeight: "80vh", overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>{report.title}</h3>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            {items.length} items · {decidedCount}/{items.length} decided
            {allDecided && approvedCount > 0 && ` · ${approvedCount} approved → PRD`}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer" }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", background: "#1e293b", borderRadius: "2px", marginBottom: "16px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${items.length > 0 ? (decidedCount / items.length) * 100 : 0}%`,
            background: allDecided ? "#34d399" : "#67e8f9",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Decision doc link */}
      {report.decision_doc_path && (
        <a
          href={`https://knowledge.vibestribe.rocks/${report.decision_doc_path}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "block", fontSize: "0.75rem", color: "#60a5fa", marginBottom: "12px", textDecoration: "underline" }}
        >
          View council decision document →
        </a>
      )}

      {/* Items list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, idx) => {
          const rec = item.council_recommendation;
          const recStyle = rec ? REC_COLORS[rec] || REC_COLORS.watch : null;
          const isUpdating = updating === item.id;

          return (
            <div
              key={item.id}
              style={{
                background: "#0f172a",
                border: `1px solid ${item.human_decision ? REC_COLORS[item.human_decision]?.border || "#334155" : "#334155"}`,
                borderRadius: "8px",
                padding: "12px",
                opacity: isUpdating ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {/* Item header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", marginRight: "8px" }}>#{idx + 1}</span>
                  <span style={{ fontSize: "0.85rem", color: "#e2e8f0", fontWeight: 600 }}>{item.title}</span>
                </div>
                {recStyle && (
                  <span
                    style={{
                      fontSize: "0.65rem",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      background: recStyle.bg,
                      border: `1px solid ${recStyle.border}`,
                      color: recStyle.text,
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    Council: {rec}
                  </span>
                )}
              </div>

              {item.summary && (
                <p style={{ margin: "0 0 6px", fontSize: "0.75rem", color: "#94a3b8", lineHeight: "1.4" }}>
                  {item.summary}
                </p>
              )}

              {item.council_reasoning && (
                <p style={{ margin: "0 0 6px", fontSize: "0.7rem", color: "#7c8ca1", fontStyle: "italic" }}>
                  {item.council_reasoning}
                </p>
              )}

              {item.council_concerns && item.council_concerns.length > 0 && (
                <div style={{ marginBottom: "8px" }}>
                  {item.council_concerns.map((c, ci) => (
                    <span
                      key={ci}
                      style={{
                        display: "inline-block",
                        fontSize: "0.6rem",
                        padding: "1px 6px",
                        margin: "1px 2px",
                        borderRadius: "3px",
                        background: "#fbbf2415",
                        color: "#fbbf24",
                        border: "1px solid #fbbf2433",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                {(["approve", "watch", "reject"] as const).map((decision) => {
                  const isActive = item.human_decision === decision;
                  const style = REC_COLORS[decision];
                  return (
                    <button
                      key={decision}
                      onClick={() => handleDecision(item.id, decision)}
                      disabled={isUpdating}
                      style={{
                        flex: 1,
                        padding: "6px 0",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        border: `1px solid ${isActive ? style.border : "#334155"}`,
                        borderRadius: "4px",
                        background: isActive ? style.bg : "transparent",
                        color: isActive ? style.text : "#64748b",
                        cursor: isUpdating ? "wait" : "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {DECISION_ICONS[decision]}
                    </button>
                  );
                })}
              </div>

              {item.human_notes && (
                <p style={{ margin: "6px 0 0", fontSize: "0.65rem", color: "#64748b" }}>
                  Notes: {item.human_notes}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {allDecided && (
        <div style={{ marginTop: "12px", padding: "10px", background: "#34d39912", border: "1px solid #34d39944", borderRadius: "6px", textAlign: "center" }}>
          <span style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: 600 }}>
            All items decided! {approvedCount > 0 ? `${approvedCount} approved items will be batched into a PRD.` : "No items approved."}
          </span>
        </div>
      )}
    </div>
  );
};

export default ResearchReportPanel;
