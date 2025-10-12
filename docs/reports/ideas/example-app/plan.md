# Plan Summary
Slice: Shared Context Backbone (S0)
Goal: Ensure every agent reads the same repo snapshot, OpenSpec digest, and synced state.

## Tasks
- **S0.1 - Wire Repo Snapshot Writer**
  - Purpose: Emit docs/reports/repo-snapshot.json with git metadata for downstream agents.
  - Deliverables: scripts/context/write-repo-snapshot.mjs
  - Platform: vscode-codex (openai:gpt-4.1-mini)
  - Confidence: 0.970

- **S0.2 - Generate OpenSpec Digest**
  - Purpose: Scan openspec/changes and produce docs/updates/OPEN_SPEC_DIGEST.md + JSON index.
  - Deliverables: scripts/context/generate-openspec-digest.mjs
  - Platform: vscode-codex (openai:gpt-4.1-mini)
  - Confidence: 0.970

- **S0.3 - Sync Dashboard State**
  - Purpose: Mirror data/state/**/* into docs/state/**/* for GitHub Pages telemetry dashboards.
  - Deliverables: scripts/pages/sync-dashboard-state.mjs
  - Platform: opencode-studio (opencode:glm-4-6-free)
  - Confidence: 0.960
  - Handoff: Include execution.chat_url in the completion so supervisors can audit hosted platform runs.
