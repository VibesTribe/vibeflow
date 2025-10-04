# Vibeflow — Strategic PRD + Technical Addendum (v1)

> Purpose: Vibeflow is a vendor‑agnostic meta‑orchestrator that plans, routes, executes, validates, and ships work across AI agents and external platforms/tools—safely, audibly, and cost‑consciously.

---

## 0) Scope & Non‑Goals
**Scope.** A modular, schema‑driven platform: planning → orchestration → execution → validation → approvals → CI merge.

**Non‑Goals.**
- Not a single LLM/copilot; Vibeflow orchestrates many.
- Not a custom browser automation framework; we integrate via MCP (e.g., browser‑use, DevTools MCP).
- Not a monolith; each capability is a swappable module with explicit contracts.

---

## 1) System Overview (Logical)
- **Orchestrator** – capability‑ and policy‑aware routing using Capability Vectors + Model Scorecard.
- **Planning Agent** – contract‑first DSPy‑style decomposition into a DAG; ≥0.95 confidence gate.
- **Supervisor** – validates outputs against contracts/DoD; handles retries and decomposition.
- **Task Agents** – workers for code/content/UI; **Visual Agent** via DevTools MCP/browser‑use.
- **Test Agents** – unit/integration/E2E; structured pass/fail.
- **Watcher** – loop/drift detection; halts and reroutes per policy.
- **Analyst** – logs RunMetrics; updates Scorecards/Vectors; powers A/B and shadow routing.
- **MCP Gateway** – tool abstraction (browser, FS, Git, CI, tracing) + secrets redaction.
- **Dashboard** – real‑time state machine per task; DAG graph; provenance; approvals; merge gates.

---

## 2) Inter‑Agent Contracts (Schemas)

### 2.1 `TaskContract` (JSON)
```json
{
  "task_id": "S1.2.3",
  "title": "Implement routing formula",
  "context_snapshot_id": "sha256(PRD+WBS+RoutingPolicy)",
  "parent_task_id": null,
  "task_type": "code|config|test|mcp|ci",
  "domain_tag": "orchestrator",
  "stage": "submitted",
  "review_policy": "auto | visual_agent | human | merge_gate",
  "constraints": {
    "budget_usd": 1.50,
    "max_tokens": 12000,
    "latency_slo_ms": 60000,
    "model_behavior_required": {
      "topic_affinity": "routing and capability vectors in TS",
      "policy_flags": ["PII_FREE", "DETERMINISTIC_REQUIRED"],
      "max_token_context": 128000
    }
  },
  "inputs": {
    "artifacts": ["orchestrator/routing.ts"],
    "env": ["NODE_ENV", "OPENAI_API_KEY?"],
    "dependencies": ["S1.2.1"]
  },
  "acceptance_criteria": [
    "unit tests: routing selects same top candidate for fixed seed",
    "handles rate-limit backoff and circuit break"
  ],
  "output_schema": {
    "files": [{"path":"orchestrator/routing.ts","type":"text"}],
    "stdout": "string?"
  },
  "model_preferences": {"temperature": 0.0, "top_p": 0.1},
  "validation_checkpoints": [
    {"name":"Schema shape","schema_ref":"#output_schema"},
    {"name":"Static typecheck","tool":"mcp.eslint_tsc"},
    {"name":"Unit tests","tool":"mcp.ci:test"}
  ]
}
```

### 2.2 `AgentMessage`
```json
{
  "trace_id": "uuid",
  "task_id": "S1.2.3",
  "from": "supervisor|orchestrator|task_agent|visual_agent|test_agent|analyst|watcher",
  "to": "orchestrator|...|dashboard",
  "timestamp": "iso8601",
  "payload": {},
  "error": null
}
```

### 2.3 `RunMetric`
```json
{
  "task_id": "S1.2.3",
  "platform": "openai",
  "model": "gpt-4.1",
  "tokens_prompt": 2100,
  "tokens_output": 800,
  "cost_usd": 0.14,
  "latency_ms": 18000,
  "success": true,
  "retries": 0,
  "validation_passed": true
}
```

### 2.4 `ModelScorecardEntry`
```json
{
  "platform": "openai",
  "model": "gpt-4.1",
  "task_type": "routing_code",
  "success_rate_30d": 0.93,
  "p50_latency_ms": 16000,
  "p95_latency_ms": 51000,
  "cost_per_1k_tokens": 0.0025,
  "rate_limit_rps": 3,
  "max_context_tokens": 128000,
  "policy_flags": ["PII_FREE", "ALLOW_CODE_EXEC=false"]
}
```

### 2.5 `CapabilityVector`
```json
{
  "agent_id": "openai:gpt-4.1",
  "embedding": "[...]",
  "policy_flags": ["PII_FREE","DETERMINISTIC_OK"],
  "resource": { "max_ctx": 128000, "rps": 3 },
  "score_modifiers": { "recent_failures": 0.0, "cooldown": 0.0 },
  "metadata": { "notes": "great for TS deterministic codegen" }
}
```

### 2.6 `RoutingPolicy` (math + filters)
- **Eligibility filters**: policy flags, context window, circuit breakers, budget.
- **Optimization**: `Score = w1*cosine(Q_task, C_agent) – w2*resource_gap – w3*expected_cost + w4*historical_success`.
- **Fallbacks**: Top‑N candidates; optional A/B shadowing.

---

## 3) Operational Policies

### 3.1 Budget
- Per‑task cap (`constraints.budget_usd`) + daily per‑platform caps.
- Auto‑pause at 90% daily usage; Supervisor can request override.

### 3.2 Routing
- Orchestrator uses Capability Vectors; Analyst updates vectors nightly and on‑demand.
- Enforce policy flags (PII, tone, determinism, exec permissions).

### 3.3 Confidence & Planning Gate
- Planner must reach **≥0.95 confidence** per task. If not, decompose or clarify.

### 3.4 Failure & Retry
- Error codes: `E/REASONING_FLAW`, `E/HALLUCINATION_DETECTED`, `E/RATE_LIMIT`.
- 1 retry on same model with enriched prompt → else re‑route.
- Exponential backoff + circuit breaker per platform/model.

### 3.5 Continuous Validation
- Checkpoints in every `TaskContract` (schema/type/tests).
- Visual Agent via DevTools MCP for UI/accessibility/console.
- Human approval required for visual/UX and merges (configurable `review_policy`).

### 3.6 Branching Flow (CI/CD)
- `task/*` branches for work → `slice/*` PR → merge‑gate → `main`.
- Provenance: `completedBy {platform, model}` recorded at completion.

---

## 4) Security: RBAC & Data Classification
Roles: `admin`, `maintainer`, `reviewer`, `operator`, `viewer`.
Classes: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `SENSITIVE`.
- Secrets via vault; MCP Gateway redacts; deny external calls for `SENSITIVE` unless allow‑listed.

---

## 5) DSPy‑Style Contract‑First Prompting (Lean)
- **Signature** ≡ `TaskContract` + `output_schema`.
- **Clarification Loop**: list gaps → ask one targeted Q at a time → **≥0.95** → echo‑check → lock.
- Summarizer compacts context; token‑lean prompts; deterministic params where needed.

---

## 6) Federation & Clusters (Optional Later)
- Call‑for‑Proposals (multiple planners) → Synthesis DAG.
- Smart Cluster (3–5 agents) for high‑risk subtasks: critique → revise → vote → finalize.

---

## 7) Observability & Governance
- Lean telemetry + optional Langfuse.
- Shadow routing toggle; Analyst correlates vector score ↔ success.
- Append‑only audit trail: policy changes, routing decisions, approvals, merges.

---

## 8) Vertical Slices (Overview)

**Phase 0 – Environment & CI**
1. Repo & Branching – main, slice/*, task/*, protections.
2. CI Scaffolding – lint, typecheck, unit tests; secrets baseline.
3. Telemetry bootstrap – log format, ingestion stub, dashboards skeleton.

**Phase 1 – Data Plane**
4. Capability Vector Index – pgvector schema + CRUD + seed loader.
5. Model Scorecard – aggregate + API.

**Phase 2 – Orchestrator Core**
6. Routing Module – eligibility filters + optimization formula.
7. Budget Guard & Circuit Breakers – caps, backoff.

**Phase 3 – Contract & Planning**
8. TaskContract Engine – validators (schema/type).
9. Planning Agent – contract‑first, clarification loop, 0.95 gate.

**Phase 4 – Supervisor & Validator**
10. Supervisor – DoD checks, decomposition/retry.
11. Validator Agent – reasoning_audit checks; hallucination flags.

**Phase 5 – MCP Gateway & Browser**
12. MCP Gateway – abstraction + secrets redaction.
13. Browser‑Use / DevTools MCP – Visual Agent integration.

**Phase 6 – Dashboard**
14. State Machine UI – stages, pills, provenance, approvals.
15. Graph View – DAG render; filter & search.

**Phase 7 – CI/CD Flow**
16. Branch/PR Orchestration – task → slice → main.
17. Merge Gatekeeper – slice‑level green gate; conflict checks.

**Phase 8 – Security**
18. RBAC – roles + enforcement.
19. Data Classification – policies, deny/allow lists.

**Phase 9 – Observability**
20. RunMetrics Ingest – persistence; charts.
21. Shadow Routing – compare legacy vs. vector routing.

**Phase 10 – Watcher**
22. Loop/Drift Detection – idle/oscillation; auto‑halt + reroute.
23. Auto‑feedback – enrich prompt; notify Supervisor.

**Phase 11 – Knowledge & RAG (Optional)**
24. Lean RAG – project context snapshots; retrieval policy.
25. Hybrid RAG hooks – pluggable strategy.

**Phase 12 – Federation (Optional)**
26. MQTT Layer – cluster room; proposals; consensus protocol.

---

## 9) Planning Agent – Master Prompt (Deterministic)

**System**
You are the Vibeflow Planning Agent. Transform a project goal into a DAG of atomic tasks that any execution agent can follow precisely. Achieve ≥0.95 confidence before finalizing. Use contract‑first rules, a structured clarification loop, and an echo check.

**Rules**
1) Never assume missing facts—list GAPS, then ask one focused question at a time until ≥0.95 confidence.
2) Produce machine‑readable output only in the schema below.
3) Each task must include `TaskContract`, `review_policy`, `validation_checkpoints`, and acceptance criteria.
4) Prefer decomposition over ambiguity.
5) Respect budgets; set deterministic params where required.
6) Tag tasks with `task_type` and `domain_tag` for routing.

**Output Schema**
```json
{
  "context_snapshot_id": "sha256",
  "slices": [
    {
      "slice_id": "S1",
      "name": "Orchestrator Routing Module",
      "goal": "…",
      "tasks": [
        {
          "task_id": "S1.1",
          "task_type": "code|config|test|mcp|ci",
          "domain_tag": "orchestrator",
          "contract": { },
          "confidence": 0.0,
          "depends_on": ["S0.2"],
          "notes": "short rationale"
        }
      ]
    }
  ],
  "open_questions": [
    {"q":"…", "reason":"…", "blocked_tasks":["S1.2"] }
  ],
  "echo_check": "One crisp sentence: deliverable / must‑include fact / hardest constraint."
}
```

**Acceptance for the Plan**
- No cycles; graph is a DAG.
- Each task’s `confidence ≥ 0.95` (or it remains in `open_questions`).
- Cumulative budget across tasks ≤ stated limit (if provided).
- All tasks carry `review_policy` and `validation_checkpoints`.

**Defaults**
- `visual_agent` for UI/UX, `merge_gate` for slice PRs, `human` for risky changes, else `auto`.

---

## 10) Tech Stack (bloat‑free)
- **TypeScript** services; **Python** allowed for Analyst/ML.
- **LiteLLM** adapter (OpenAI/Anthropic/Gemini/Bedrock/local).
- **Postgres + pgvector** (Capability Vectors & scorecards).
- **MCP** for tools; HTTP/gRPC internally.
- **GitHub Actions**; task/* → slice/* → main; required checks.
- **Observability**: lean pipeline + optional Langfuse.
- **Security**: Vaulted secrets; RBAC via OIDC/JWT; Gateway policy checks.

---

## 11) Rationale & Moat
- Data‑centric contracts & vectors keep core logic stable; new models/tools = data updates.
- Continuous validation and review policies prevent drift and invisible failure.
- MCP abstraction insulates from tool churn; CI path makes merges deterministic.

---

## 12) Next Artifacts (to be added)
- `planning_prompt.md` (stand‑alone version of §9)
- `slice_template.json` (empty schema for Planner output)
- `contracts/` folder with JSON Schemas for validation
- `routing_policy.md` with weights & tuning playbook

