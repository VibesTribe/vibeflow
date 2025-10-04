# Missing Docs — Minimal Stubs Pack (v1)

> Drop each code block into the matching path in your `docs` branch. These are concise, production‑ready stubs that align with the PRD and existing specs.

---

## docs/policies/review_policy.md
```md
# Review Policy (Default)

**Purpose.** Deterministic routing to the right approval gate.

## Mapping
- `ui/*` → `visual_agent` (Visual Agent check + human approval if configured)
- `merge/*` → `merge_gate` (slice PR needs all green checks)
- `code/*` (non‑visual) → `auto`
- otherwise → `human`

## Override
Per‑task via `TaskContract.review_policy`.
```

---

## docs/arch/overview.md
```md
# Architecture Overview (MVP)

**Core services**: Orchestrator, Planning, Supervisor, Task Agents, Visual Agent, Test Agents, Watcher, Analyst, MCP Gateway, Registry, Dashboard.
**Data**: Postgres + pgvector; RunMetrics; Scorecards; CapabilityVectors; Audit Log; Snapshots.
**Contracts**: TaskContract, Plan, RunMetric, Scorecard, CapabilityVector.
**Policies**: Routing, Review, Budget, Failure/Retry, Confidence Gate.
```

---

## docs/agents/roles.md
```md
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
```

---

## docs/agents/confidence.md
```md
# Confidence Policy

Planner emits `confidence` with evidence components; Supervisor recomputes from ground truth. Hard gate ≥0.95; reject when |planner−supervisor|>0.05.
Components: spec_coverage, acceptance_alignment, similar_task_prior, routing_fit, budget_feasibility.
```

---

## docs/mcp/tool_contract.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/mcp-tool-v1.json",
  "type": "object",
  "required": ["name", "description", "inputs", "outputs"],
  "properties": {
    "name": {"type": "string"},
    "description": {"type": "string"},
    "inputs": {"type": "object"},
    "outputs": {"type": "object"},
    "policy_flags": {"type": "array", "items": {"type": "string"}}
  }
}
```

---

## docs/mcp/browser_use_checklist.md
```md
# Browser‑Use / DevTools MCP Checklist

- Auth via Gateway; never emit raw secrets to prompts.
- Capture console errors, network failures; measure LCP.
- Run a11y scan; emit DOM snapshot diff for Supervisor.
- Store provenance: URL, timestamp, agent, run id.
```

---

## docs/ci/job_matrix.md
```md
# CI Job Matrix (MVP)

- lint+typecheck (node@20)
- unit (node@20)
- schema‑validate (ajv on ./contracts)
- docs‑link‑check (markdown)
- optional: e2e (playwright)
```

---

## docs/ci/branch_flow.md
```md
# Branch Flow

- Work: `task/*` → PR to `slice/*`
- Gate: `slice/*` must be green (lint, typecheck, tests, schema‑validate)
- Merge: `slice/*` → `main` via `merge_gate` approval
```

---

## docs/obs/telemetry.md
```md
# Telemetry Fields (RunMetric/Event)

- trace_id, task_id, slice_id
- platform, model, tokens_prompt, tokens_output, cost_usd
- latency_ms, success, retries, error_code
- validation_passed, review_policy, provenance
```

---

## docs/security/rbac.md
```md
# RBAC (roles)

- admin, maintainer, reviewer, operator, viewer
Enforce at Gateway, API, and Dashboard; audit all role changes.
```

---

## docs/security/data_classification.md
```md
# Data Classification

- PUBLIC, INTERNAL, CONFIDENTIAL, SENSITIVE
Gateway enforces: redact secrets; deny external calls for SENSITIVE unless allow‑listed.
```

---

## docs/ux/dashboard_spec.md
```md
# Dashboard Spec (MVP)

- Cards per task with stage, status, confidence, provenance, review buttons
- Global progress, per‑slice progress
- DAG graph per slice; filter/search
- Approvals: visual_agent, human, merge_gate; audit log panel
```

---

## docs/contracts/plan.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/plan-v1.json",
  "type": "object",
  "required": ["context_snapshot_id", "slices", "echo_check"],
  "properties": {
    "context_snapshot_id": {"type": "string"},
    "slices": {"type": "array", "items": {"type": "object"}},
    "open_questions": {"type": "array", "items": {"type": "object"}},
    "echo_check": {"type": "string"}
  }
}
```

---

## docs/contracts/task_contract.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/task-contract-v1.json",
  "type": "object",
  "required": ["task_id", "title", "context_snapshot_id", "task_type", "domain_tag", "constraints", "output_schema"],
  "properties": {
    "task_id": {"type": "string"},
    "title": {"type": "string"},
    "context_snapshot_id": {"type": "string"},
    "task_type": {"type": "string"},
    "domain_tag": {"type": "string"},
    "constraints": {"type": "object"},
    "output_schema": {"type": "object"},
    "review_policy": {"type": "string"}
  }
}
```

---

## docs/contracts/run_metric.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/run-metric-v1.json",
  "type": "object",
  "required": ["task_id", "platform", "model", "cost_usd", "latency_ms", "success"],
  "properties": {
    "task_id": {"type": "string"},
    "platform": {"type": "string"},
    "model": {"type": "string"},
    "cost_usd": {"type": "number"},
    "latency_ms": {"type": "integer"},
    "success": {"type": "boolean"}
  }
}
```

---

## docs/contracts/model_scorecard.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/model-scorecard-v1.json",
  "type": "object",
  "required": ["platform", "model", "task_type", "success_rate_30d"],
  "properties": {
    "platform": {"type": "string"},
    "model": {"type": "string"},
    "task_type": {"type": "string"},
    "success_rate_30d": {"type": "number"}
  }
}
```

---

## docs/contracts/registry_model.schema.json
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/registry-model-v1.json",
  "type": "object",
  "required": ["platform", "model", "max_context_tokens", "rate_limit_rps", "cost_per_1k_tokens"],
  "properties": {
    "platform": {"type": "string"},
    "model": {"type": "string"},
    "max_context_tokens": {"type": "integer"},
    "rate_limit_rps": {"type": "number"},
    "cost_per_1k_tokens": {"type": "number"}
  }
}
```

---

## docs/registry/seed.csv
```csv
platform,model,max_context_tokens,rate_limit_rps,cost_per_1k_tokens,supports_tools,supports_vision,supports_audio,deprecation_after,refresh_period_sec,tags,source_url,fetched_at
openai,gpt-4.1,128000,3,0.0025,true,true,false,,60,"deterministic_ok;code;json",https://example.com/openai/gpt-4-1,2025-10-04T00:00:00Z
anthropic,claude-3.7-sonnet,200000,2,0.0030,true,true,false,,60,"reasoning;long_context",https://example.com/anthropic/claude-3-7-sonnet,2025-10-04T00:00:00Z
google,gemini-2.0-pro,100000,4,0.0020,true,true,true,,45,"multimodal;tools",https://example.com/google/gemini-2-0-pro,2025-10-04T00:00:00Z
local,lama-3-70b-instruct,32000,10,0.0002,true,false,false,,0,"self_hosted;cheap",https://example.com/local/llama-3-70b,2025-10-04T00:00:00Z
```

