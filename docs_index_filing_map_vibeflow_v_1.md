# Vibeflow Documentation Index & Filing Map (v1)

This is the canonical map for the `docs` branch. Each section lists the file path, purpose, and a compact template.

---

## 0. Top-Level
**`docs/README.md`** — entry point, quickstart, links.
```md
# Vibeflow Docs (branch: docs)
- PRD: ./prd/Vibeflow_PRD.md
- Contracts: ./contracts/
- Policies: ./policies/
- Architecture: ./arch/
- Agents: ./agents/
- MCP: ./mcp/
- CI/CD: ./ci/
- Observability: ./obs/
- Security: ./security/
- UX Dashboard: ./ux/
- Research Registry: ./registry/
```

**`docs/CONTRIBUTING.md`** — style, commit, schema evolution.
```md
# Contributing
- Prefer additive schema changes. Use semver in $id.
- All JSON emits must validate against ./contracts/*.
- Open PRs against the `docs` branch; CI validates schemas.
```

---

## 1. PRD & Planning
**`docs/prd/Vibeflow_PRD.md`** — copy of the PRD (current canvas title: *Vibeflow PRD — Strategic + Technical Addendum (v1)*).
**`docs/prd/planning_prompt.md`** — Planning Agent prompt (from canvas).
**`docs/prd/slice_template.json`** — Planner output skeleton (from canvas).

---

## 2. Contracts (Schemas)
**`docs/contracts/plan.schema.json`**, **task_contract.schema.json**, **run_metric.schema.json**, **model_scorecard.schema.json**, **registry_model.schema.json**, **capability_vector.schema.json** — (from canvas pack).

**`docs/contracts/README.md`**
```md
# Contracts
- Draft 2020-12 JSON Schema.
- Validate planner/supervisor/orchestrator IO.
- Change policy: additive only; bump $id.
```

---

## 3. Policies
**`docs/policies/routing_policy.md`** — compact routing policy (from canvas). 
**`docs/policies/supervisor_checklist.md`** — Supervisor checklist (from canvas).
**`docs/policies/review_policy.md`** — default review mapping & merge gates.
```md
# Review Policy (default)
- ui/* → visual_agent
- merge/* → merge_gate
- code/* (non-visual) → auto
- otherwise → human
Override per TaskContract.review_policy.
```

---

## 4. Architecture
**`docs/arch/overview.md`** — system diagram & component roles.
```md
# Architecture Overview
Components: Orchestrator, Planning, Supervisor, Task Agents, Visual Agent, Test Agents, Watcher, Analyst, MCP Gateway, Registry, Dashboard.
Data: Postgres + pgvector; Audit Log; RunMetrics; Scorecards; CapabilityVectors.
```

**`docs/arch/orchestrator_scoring.md`** — TS-ish pseudocode (from canvas).
**`docs/arch/capability_vector_embedding.md`** — embedding recipe (from canvas).

---

## 5. Agents
**`docs/agents/roles.md`** — responsibilities & inputs/outputs per agent.
```md
# Agent Roles (IO)
- Planning → input: goal, PRD; output: slices (JSON), open_questions, echo_check.
- Supervisor → input: plan, tasks, outputs; output: accept/reject, handoff, metrics.
- Orchestrator → input: task, vectors; output: routing decision, fallbacks.
- Visual Agent → input: task + URL/app; output: visual checks (console, LCP, a11y).
- Test Agent → input: repo/branch; output: test report.
- Watcher → input: streams; output: halt/reroute signals.
- Analyst → input: RunMetrics; output: scorecards, vector updates.
- Research Agent → input: provider docs; output: registry updates.
```

**`docs/agents/confidence.md`** — computation & anti-hallucination.
```md
# Confidence
- Planner outputs evidence-based components.
- Supervisor recomputes; reject if Δ>0.05 or <0.95.
```

---

## 6. MCP
**`docs/mcp/tool_contract.schema.json`** — minimal MCP tool contract.
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

**`docs/mcp/browser_use_checklist.md`**
```md
# Browser-Use / DevTools MCP Checklist
- Auth & secrets via Gateway; never emit raw secrets to prompts.
- Record console errors; capture network failures; LCP; a11y scan.
- Provide DOM snapshot diff for Supervisor.
```

---

## 7. CI/CD
**`docs/ci/job_matrix.md`** — minimal job matrix.
```md
# CI Job Matrix (MVP)
- lint+typecheck (node 20)
- unit (node 20)
- e2e (playwright; optional)
- schema-validate (ajv on ./contracts)
- docs-link-check (markdown links)
```

**`docs/ci/branch_flow.md`**
```md
# Branch Flow
- Work: task/* → PR to slice/*
- Gate: slice/* must be green (tests, checks)
- Merge: slice/* → main via merge_gate approval
```

---

## 8. Observability
**`docs/obs/telemetry.md`** — event shapes; Langfuse optional.
```md
# Telemetry Fields
- trace_id, task_id, platform, model, tokens, latency, cost, outcome, error_code
```

---

## 9. Security
**`docs/security/rbac.md`** — roles & enforcements.
```md
# RBAC
Roles: admin, maintainer, reviewer, operator, viewer.
Enforce at Gateway and Dashboard.
```

**`docs/security/data_classification.md`** — PUBLIC/INTERNAL/CONFIDENTIAL/SENSITIVE.

---

## 10. UX Dashboard
**`docs/ux/dashboard_spec.md`** — state machine, stages, approvals, graph.
```md
# Dashboard Spec (MVP)
- Cards per task with stage, provenance, review buttons.
- Graph: DAG per slice; filter/search.
- Approvals: visual_agent, human, merge_gate.
```

---

## 11. Registry
**`docs/registry/spec.md`** — (copy of Research Agent & Registry spec).
**`docs/registry/seed.csv`** — example (from canvas).

---

## 12. Glossary
**`docs/GLOSSARY.md`**
```md
# Glossary
- Vertical Slice: demo-able increment composed of atomic tasks.
- DAG: dependency graph among tasks; no cycles.
- Capability Vector: embedding + policy/resource traits per model/agent.
- Scorecard: rolling success/latency/cost per task_type.
```
