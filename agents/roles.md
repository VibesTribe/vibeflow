# Agent Roles — Inputs/Outputs

- **Planning**: in: goal+PRD → out: slices (DAG JSON), open_questions, echo_check, ≥0.95 confidence.
- **Supervisor**: in: plan/task/outcome → out: accept/reject, handoff, metrics.
- **Orchestrator**: in: TaskContract+Vectors → out: routing decision (+fallbacks), audit.
- **Task Agent**: in: TaskPacket → out: artifacts per `output_schema`.
- **Visual Agent**: in: URL/app → out: console/a11y/perf checks (DevTools MCP).
- **Test Agent**: in: repo/branch → out: unit/integration/E2E results.
- **Watcher**: in: streams → out: halt/reroute on loops/drift.
- **Analyst**: in: RunMetrics → out: Scorecards, vector updates.
- **Research**: in: provider docs → out: registry rows, diffs.
