# Vibeflow Overview

Vibeflow orchestrates multiple AI agents through a deterministic lifecycle: research → PRD → planning → execution → validation → merge. The v5 system enforces manifest-driven edits, region-scoped patches, and policy-backed runtime checks.

## Key Concepts

- **Orchestrator** coordinates tasks, manages dependencies, and emits lifecycle events.
- **Planner** decomposes work into high-confidence tasks that obey the 0.95 rule.
- **Router** selects execution platforms using metrics from `data/registry/platforms/index.json`.
- **Agents** operate within strict prompts and deliverables, creating reproducible outputs.
- **Skills** expose CLI, MCP, and web studio capabilities via declarative manifests.

See `docs/runbook.md` for operational guidance and `docs/tech-stack.md` for implementation details.
