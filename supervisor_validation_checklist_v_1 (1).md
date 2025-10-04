# Supervisor Validation Checklist — v1 (Compact)

Use this to accept/reject tasks, enforce ≥0.95 planner confidence, and write handoffs.

## A. Pre‑assignment (Planner output)
1) **Plan Schema** — validate against `contracts/plan.schema.json`.
2) **TaskContract** — each task validates against `task_contract.schema.json`.
3) **Confidence Gate** — recompute `confidence` from:
   - Spec coverage (fields present; inputs/outputs/constraints populated).
   - Acceptance alignment (tests/checkpoints present and relevant).
   - Similar task prior (ModelScorecard success for task_type/domain_tag).
   - Routing fit (Capability Vector similarity + eligibility count ≥ 1).
   - Budget feasibility (tokens×price ≤ budget).  
   **Reject** if score < 0.95 or |planner − supervisor| > 0.05.
4) **Review Policy** — set defaults if missing (`ui/*→visual_agent`, etc.).
5) **Decomposition** — if rejected, request decomposition or targeted clarifications.

## B. Post‑execution (Task Agent result)
6) **Output Schema** — files/stdout match `output_schema`; no extra files.
7) **Static Checks** — typecheck/lint; secrets redaction confirmed by Gateway.
8) **Tests** — run `validation_checkpoints`: unit/integration/E2E; collect results.
9) **Visual Agent** (if required) — DevTools MCP checks: console errors, LCP, a11y, DOM diffs.
10) **Provenance** — record `{platform, model}` and RunMetric; store in Scorecard.
11) **Handoff Write‑back** — if accepted, write:
```
handoff: {
  brief: "<=600 chars summary for dependents",
  artifact_refs: ["artifact://..."],
  snapshot_id: "sha256"
}
```

## C. Merge & Release
12) **Branching** — ensure task/* merged into slice/* only after tests green.
13) **Merge Gate** — slice CI all-green, conflicts resolved, regressions none.
14) **Audit** — append decision log with reasons and metrics.

## D. Failure Codes (standard)
- `E/REASONING_FLAW`, `E/HALLUCINATION_DETECTED`, `E/RATE_LIMIT`, `E/VALIDATION`, `E/BUDGET`.

## E. Telemetry
- Emit RunMetrics per attempt; mark retries and final disposition (reroute, success, fail).

