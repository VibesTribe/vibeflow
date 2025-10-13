# Plan Summary
Slice: Maintenance Automation Bootstrap (M1)
Goal: Stand up automated drift detection and registry refreshers so orchestrator stays healthy.

## Tasks
- **M1.1 - Implement Plan Drift Scanner**
  - Purpose: Detect differences between docs/reports/ideas/<id>/plan.md and live task packets.
  - Deliverables: scripts/maintenance/run-plan-drift-check.mjs, docs/reports/ideas/maintenance-agent/drift-report.md
  - Platform: openai:gpt-4.1-mini (openai:gpt-4.1-mini)
  - Confidence: 0.960

- **M1.2 - Schedule Registry Refresh**
  - Purpose: Automate periodic syncing of data/registry/*.json into docs/state snapshots with audit trails.
  - Deliverables: scripts/maintenance/run-registry-refresh.mjs, docs/state/maintenance/registry-refresh.log.json
  - Platform: openai:gpt-4.1-mini (openai:gpt-4.1-mini)
  - Confidence: 0.950
