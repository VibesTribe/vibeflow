```markdown
# 🌌 Vibeflow — Complete System Reference  
**File:** `docs/overview/vibeflow_complete_reference.md`  
**Last updated:** October 2025  
**Maintainer:** `@VibesTribe`  
**Status:** Canonical reference for architecture, agents, tech stack, and governance hierarchy.

---

## 🧭 North Star

> **Vibeflow** is a vendor-agnostic **meta-orchestrator** for AI-assisted development.  
> It plans, routes, executes, validates, and learns from every step of a project lifecycle — ensuring that *the right agent, using the right tool, at the right time, for the right cost* executes every task under human oversight.  
> Vibeflow is contract-first, observable, and self-improving: every decision and artifact is traceable, cost-aware, and reversible.

---

## 🔁 Canonical Flow

**Idea → Research → PRD → Planning → Orchestration → Execution → Validation → Human Approval → Merge → Telemetry & ROI → Learning**

---

## 🧠 System Logic & Role Hierarchy

### 1️⃣ Ideation & Validation

| Agent | Role | Inputs | Outputs | Notes |
|-------|------|--------|----------|-------|
| **Research Agent (Market)** | Gathers competitor, feature, and tech intelligence. | Idea prompt | `research.report.json` | May call search / YouTube APIs. |
| **User Selection Loop** | Human review and confirmation of proposed features. | Report | `user.selection.json` | Manual step in dashboard. |
| **Research Agent (PRD Synthesizer)** | Produces structured PRD (architecture, stack, goals, constraints). | Selection JSON | `prd/{project}.json` | Uses OpenSpec schema. |

---

### 2️⃣ Planning Layer

| Agent | Function | Inputs | Outputs | Review |
|--------|-----------|---------|----------|---------|
| **Planner Agent** | Decomposes PRD into vertical-slice atomic tasks with confidence ≥ 0.95. | PRD | `plan.schema.json`, `tasks/slices/*.json` | **Supervisor (Plan)** |
| **Supervisor (Plan Stage)** | Reviews Planner output for atomicity, dependency integrity, tech-stack alignment, and realism. | Draft plan | Approved Plan DAG | Provides feedback to Planner. |

---

### 3️⃣ Orchestration & Execution Layer

| Agent | Function | Inputs | Outputs | Review |
|--------|-----------|---------|----------|---------|
| **Orchestrator (“Vibes”)** | Strategic router + governed editor. Chooses best platform/model per task, sets timeouts, token & cost limits, may split or revise tasks, and generates new prompt packets as needed. | Approved Plan + telemetry + model caps | `assignment.plan.json` | — |
| **Task Agents** | Execute prompt packets within assigned environments (CLI, Codex, OpenCode, Gemini, DeepSeek, etc.). | Assignment plan | `task_output/{task_id}.json` | **Supervisor (Execution)** |
| **Supervisor (Execution Stage)** | Validates each output against full-project context — functionality, stack, alignment, and integration with all other modules. | Task outputs + Plan + PRD | Validation report | Orchestrator |
| **Tester Agents** | Automated validation (code + UI/UX). | Deliverables | `test_results/{task_id}.json` | Supervisor |
| **Human Reviewer** | Final approval for any task marked `review_policy: human` or visual outputs. | Test results | Approval / Revision | Supervisor + Orchestrator |

**Key Behaviors**

- Each task keeps a persistent `task_id` across retries.  
- Orchestrator auto-reroutes on quota or token limits.  
- Chat URLs preserved for revision continuity.  
- Brevo alerts on provider credit/quota issues.  
- Supervisor maintains holistic system alignment before approval.

---

### 4️⃣ Continuous Improvement Layer

| Agent | Function | Inputs | Outputs |
|--------|-----------|---------|----------|
| **System Researcher** | Tracks new models, APIs, costs, and safety updates. | External APIs + News | `system_research.digest.json` |
| **Maintenance Agent** | Applies safe updates endorsed by Supervisor + Researcher; verifies no regression. | Research Digest | `maintenance.log.json` |
| **Analyst Agent** | Aggregates RunMetrics, success, latency, ROI; updates CapabilityVectors & Scorecards. | Telemetry | Updated scorecards |
| **Watcher Agent** | Observes live runs for loops, drift, or stalls; pauses or reroutes when necessary. | Real-time metrics | Alerts + reroute signals |

---

### 5️⃣ Governance & Dashboard Layer

| Component | Purpose |
|------------|----------|
| **Dashboard (Pages)** | Central view of tasks, states, metrics, approvals, and provenance. |
| **MCP Gateway** | Interface for IDE & Browser tools (Codex, DevTools, Browser-Use). |
| **Security / RBAC** | Restricts data access; validates secrets via `secrets-registry.json`. |
| **Telemetry Loop** | Supabase sync updates routing weights nightly. |

---

## 🔧 Governed Autonomy Model

| Role | Autonomy Type | Description |
|------|----------------|-------------|
| **Orchestrator (Vibes)** | **Governed-editorial** | Edits metadata, prompts, or task structure to fix or split deliverables; sets new limits or timeouts; ensures safe reruns. Never edits code directly. |
| **Supervisor** | **Analytical & Integrative** | Holds full project overview; validates alignment of every output with overall intent, stack, and aesthetic coherence. Approves Planner, Task, and Tester outputs. |
| **Planner** | **Adaptive** | Refines future plans from Supervisor feedback and confidence metrics. |
| **Task Agents** | **Operational** | Execute exact instructions within their prompt packet; no external reads/writes. |
| **Tester Agents** | **Evaluative** | Verify behavior & UI; may suggest fixes but cannot merge changes. |
| **Maintenance Agent** | **Procedural** | Performs safe stack updates validated by Supervisor + Researcher. |
| **Human Reviewer** | — | Final arbiter for all visual and UX merges. |

> 🧩 **Agent-OS excluded:** Vibeflow agents are role-bound components within a directed workflow.  
> They do not self-spawn or interfere with one another; all coordination flows through the Orchestrator.

---

## 🧱 Architectural Layering

| Layer | Runtime / Adapter | Role | Autonomy | Notes |
|--------|--------------------|------|-----------|-------|
| **Core Orchestrator** | `orchestrator.ts` | Routing + prompt editor + governance. | Governed-editorial | Can split tasks, set timeouts, re-prompt. |
| **Planner / Supervisor / Maintenance / Analyst / Researcher / Watcher** | TS modules | Analysis & validation stages. | Bounded procedural | JSON I/O contracts only. |
| **Task Agents** | `opencodeAdapter`, `rooAdapter`, `kiloAdapter`, etc. | Execute deliverables in external platforms. | Operational | Strict path allowlists. |
| **Tester Agents** | `browserUseAdapter`, `devtoolsMcpAdapter` | Validate UX + functionality. | Evaluative | Gate before merge. |
| **Human Reviewer** | Dashboard | Governance approval. | — | Required for visual merges. |

---

## ⚙️ Design Principles

1. **Governed autonomy:** Orchestrator edits instructions, not outputs.  
2. **Supervisor as final technical authority:** ensures end-to-end alignment and integration.  
3. **Role isolation:** agents never modify others’ artifacts directly.  
4. **Deterministic lifecycle:** Idea → Research → Plan → Execute → Validate → Approve.  
5. **Provenance first:** all reassignments logged in `assignmentHistory`.  
6. **Planner learning loop:** confidence & DAG logic evolve from feedback.  
7. **Revision continuity:** reuse original chat sessions when possible.  
8. **Mandatory visual human approval.**  
9. **Telemetry-driven routing:** cost / success / latency adjust nightly.  
10. **Transparency over autonomy:** Watcher observes; Supervisor & Human approve.

---

## 🧰 Technology Stack

| Layer | Technology | Purpose |
|--------|-------------|----------|
| **Core Runtime** | **Node 20 + TypeScript** | Deterministic orchestration & schema validation. |
| **Workflow Engine** | **GraphBit (Rust/Python)** | Executes DAGs concurrently with telemetry hooks. |
| **Storage / Telemetry** | **Supabase (Postgres)** | Persists task state, metrics, and ROI. |
| **Frontend / Dashboard** | **React + Tailwind + Vite** | Real-time mission-control interface. |
| **Visualization** | **Recharts + Framer Motion** | Animated progress & metric graphs. |
| **Automation / CI** | **GitHub Actions** | Pipeline runs + state publishing. |
| **Browser Automation** | **Browser-Use + Chrome DevTools MCP** | Visual/UX testing & screenshot diffs. |
| **Memory / Context** | **OpenMemory / Mem0** | Stores summaries & feedback for recall. |
| **Notification** | **Brevo API** | Credit/quota alerts. |
| **Interfaces** | **MCP Gateways (VS Code, Browser)** | Interactive local & web-studio control. |

---

## 🛰 Mission-Control Observability Model

Vibeflow functions as a **real-time command center**, unifying every agent, adapter, and platform under one telemetry plane.

**Dashboards provide:**

- **Global View:** state of all projects, tasks, and agents.  
- **Platform View:** filter by environment (Web Studios, CLI, Codex, OpenCode …).  
- **Agent View:** drill down into any agent’s live activity.  
- **Alert View:** pending approvals / quota issues.  
- **Trace View:** lineage from plan → execution → validation.

Supabase / WebSocket streams keep the interface live; each card or graph links back to its JSON source for auditability.

---

### 🎧 Audio / Conversational Interface — *Vibes Voice*

Optional **voice interface** enables hands-free mission-control dialogue:

**Example commands**
- “What’s the current status of all agents?”  
- “Show me everything running on web platforms.”  
- “Focus on OpenCode tasks.”  
- “Are there items awaiting my approval?”  
- “Notify me when a human review is needed.”

**Architecture**

| Component | Function |
|------------|-----------|
| **Speech I/O** | Browser Speech API or Whisper STT + TTS. |
| **Command Interpreter** | Maps voice → dashboard filters / orchestrator queries. |
| **Dashboard Bridge** | WebSocket / Supabase channel updates visible panels. |
| **Notification Loop** | Audio + visual alerts on key events. |

Voice control only changes **views or focus**; it never executes or alters deliverables, maintaining Vibeflow’s *observability-first, safety-first* approach.

---

### 💡 Agnostic & Modular Design

* **Completely vendor-agnostic:** every adapter and model is swappable.  
* **Layer-modular:** runtime or provider changes require no rewiring.  
* **Fully observable:** telemetry spans local and remote runs.  
* **Command-flexible:** manage Vibeflow via UI, CLI, API, or voice — all grounded in the same JSON contracts.

---

## 🔍 Data Flow Diagram

```

[User Idea]
↓
[Research Agent (Market)]
↓  research.report.json
[User Selection]
↓
[Research Agent (PRD Synth)]
↓  prd.json
[Planner Agent]
↓
[Supervisor (Plan)]
↓
[Orchestrator]───┐
↓ assigns     │
[Task Agents]     │
↓ execute      │
[Supervisor (Execution)]
↓
[Tester Agents]──[Human Review]
↓
[Merge → Repo]
↓
[Analyst] ← RunMetrics
↓
[System Researcher] → [Maintenance]
↓
[Watcher Agent] (runtime)

````

---

## 📊 Telemetry & ROI

- **RunMetric:** tokens, latency, cost, validation outcome.  
- **AssignmentHistory:** every model/platform per `task_id`.  
- **CostLedger:** per-task ROI (Vibeflow vs counterfactual).  
- **SupabaseWriter:** streams metrics to DB.  
- **Dashboard Panels:** Model Status | ROI Totals | OpenSpec Index | Visual Results.

---

## 🧩 Supporting Documents & Navigation

| File | Description |
|------|--------------|
| [`docs/updates/handoff_2025-10-15.md`](../updates/handoff_2025-10-15.md) | Strategic addendum. |
| [`docs/contracts/task_contract.schema.json`](../contracts/task_contract.schema.json) | Task definition. |
| [`docs/contracts/routing_policy.schema.json`](../contracts/routing_policy.schema.json) | Routing + fallback rules. |
| [`docs/telemetry/run_metric.schema.json`](../telemetry/run_metric.schema.json) | Metric schema. |
| [`docs/dashboard_spec.md`](../dashboard_spec.md) | Dashboard data model. |
| [`docs/integrations/`](../integrations) | Adapter READMEs. |

---

## 🔗 README Navigation Stub

```markdown
### 📘 Documentation
- [🌌 Vibeflow Complete Reference](docs/overview/vibeflow_complete_reference.md)
- [📊 Dashboard Specification](docs/dashboard_spec.md)
- [🧱 PRD & Strategic Addendum](docs/prd/vibeflow_prd_strategic_technical_addendum.md)
````

---

> 🪶 **Summary**
> Vibeflow is a *supervised, governed orchestration ecosystem* with total real-time observability.
> The **Orchestrator** directs and edits instructions; the **Supervisor** ensures alignment and coherence; the **Planner** learns from results; the **Task and Tester Agents** execute and validate; and the **Human Reviewer** guarantees that every outcome both functions and *feels* right.
> Through its modular, vendor-agnostic tech stack and mission-control dashboard — visual or voice-driven — Vibeflow gives full awareness, zero ambiguity, and continuous self-improvement.

```

---

This version now embeds:

* Complete agent hierarchy and autonomy logic  
* Supervisor’s full-context approval scope  
* Modular, vendor-agnostic tech stack  
* Real-time mission-control observability  
* Optional audio/voice interface for Vibes  
