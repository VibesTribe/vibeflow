# Vibeflow System Plan — v2 Alignment Edition  
*(October 2025)*  

---

## 🧭 Purpose  

This document unifies and supersedes the earlier working draft **`vibeflow_complete_reference.md`**, aligning all prior strategic and architectural material into one canonical blueprint.  
It confirms that no ambiguity, conflict, or drift remains between earlier and current definitions of Vibeflow’s architecture, agents, runtime, and policies.  
Future updates should amend *this* file rather than the prior draft.

---

## 🧩 Part I — Alignment Audit  

| Theme | vibeflow_complete_reference.md | v2 Plan | Status |
|-------|--------------------------------|---------|---------|
| **Core Vision** | Mission-control orchestrator from idea → deployment. | Same; structured into Control / Execution / Data planes. | ✅ |
| **Runtime Architecture** | GraphBit = DAG engine; drop Agent-OS. | Same; GraphBit limited to executor role only. | ✅ |
| **Agent Roles** | Research, PRD, Planner, Supervisor, Tester, Maintenance. | All retained + Watcher. | ✅ |
| **Communication** | No inter-agent chat. | Same, enforced via ContextGate + MCP. | ✅ |
| **Optimization Loop** | Supabase metrics → routing. | Real-time ledger + nightly report. | ✅ |
| **Execution Channels** | CLI, web_studio, visual_gate, dag, maintenance. | Identical set, explicit adapter map. | ✅ |
| **Model Access** | LiteLLM translator. | Adapter abstraction. | ✅ |
| **MCP Integration** | Vibeflow as MCP server. | Implemented as `vibesMcpServer.ts`. | ✅ |
| **Testing / Validation** | Browser-Use + DevTools MCP. | Formalized as Visual Gate. | ✅ |
| **Telemetry** | Supabase only. | Same + pluggable local store. | ✅ |
| **Dashboard** | “VibeSymphony.” | FocusCard overlay + Voice. | ✅ |
| **Guiding Principles** | “Adapters evolve, contracts endure.” | Preserved verbatim. | ✅ |
| **Gaps resolved here** | - Schema validation - Error taxonomy - Memory tiers - Rollback system - Watcher spec - Secrets rotation - CI policy | All added and finalized. | ✅ |

---

## 🧩 Part II — Comprehensive System Plan  

*(Full implementation blueprint; unchanged from detailed version finalized October 2025.)*

### 0️⃣ North Star  
Vibeflow is a deterministic, vendor-agnostic **mission-control orchestration framework** that converts complex builds into governed, traceable AI-agent workflows.

---

### 1️⃣ Architecture Overview  
**Control Plane:** Orchestrator · Supervisor · Watcher · Memory · Policies · MCP Server · Operator Intent  
**Execution Plane:** Adapters (CLI / Web / Visual) · GraphBit Executor  
**Data Plane:** State · Runtime Ledger · Policies · Memory · Telemetry · Rollback  
**Presentation:** Dashboard · Vibes Voice  

---

### 2️⃣ Schemas & Validation  
`context_manifest.schema.json` · `task_packet.schema.json` · `run_metric.schema.json` · `test_result.schema.json`  
→ Validated runtime via Ajv/Zod before execution.

---

### 3️⃣ Policies  
ContextGate · EvidenceGate · Token Estimator · Watcher Policy · Error Taxonomy  
All policies enforced as tests within CI.

---

### 4️⃣ Orchestrator  
`chooseRoute` → consult ledger / estimator / overrides.  
`packets` → generate create | revise | repair | split.  
`liveLedger` → real-time status.  
`operatorIntent` → credit + routing updates.

---

### 5️⃣ Adapters  
CLI (Roo · Kilo · OpenCode · Codex) · WebStudio (Browser-Use sessions) · Visual (Browser-Use + DevTools MCP).  
Uniform `executeTask(packet)` interface.

---

### 6️⃣ Watcher  
Observes CLI runtime; loop detection (3-strike), quota watch, auto-reroute signals.

---

### 7️⃣ Executor (GraphBit)  
Runs approved DAGs; handles concurrency + retries; emits events → Supabase; no policy logic.

---

### 8️⃣ Memory Layer  
Evergreen (long-term) · Versioned (slice/branch) · Exemplar (curated).  
Retriever combines semantic + key search; Supervisor approves Evergreen writes.

---

### 9️⃣ Telemetry & Analytics  
RunMetrics + Scorecards + Trend Reports; event throttling to prevent spam; voice-query integration.

---

### 🔟 Dashboard & Voice  
React/Tailwind UI with Supabase Realtime; FocusCard overlay + auto-resume; Voice (TTS/STT) for queries & safe controls.

---

### 11️⃣ Git · CI · Rollbacks  
Branch per slice (`vs/<feature>`).  
CI gates → context/evidence/test/visual/human/lint.  
Auto-snapshot + tag → `vibeflow-auto-YYYYMMDD-HHMM`.  
Rollback via dashboard/voice → PR restore.

---

### 12️⃣ Security  
MCP sandbox (auth token, timeout, path allowlist); Maintenance agent rotates secrets quarterly.

---

### 13️⃣ Configurations  
`cloud.default.json` · `local.offline.json` · `hybrid.custom.json`  
→ select at runtime with `--config`.

---

### 14️⃣ Implementation Phases  
A Core Control & Safety B Adapters & Watcher C MCP & Memory D Executor & Telemetry  
E Dashboard & Voice F Visual Gate & CI G Rollback & Maintenance H Self-Build Milestone  

---

### 15️⃣ Definition of Done  
- Deterministic orchestration with real-time rerouting.  
- Parallel execution safe under GraphBit.  
- MCP operational.  
- Dashboard + Voice functional.  
- CI green + rollback verified.  
- Cloud/local/hybrid interchangeable.

---

## 🧩 Part III — Closed Gaps and Improvements  

| Gap from previous doc | Resolution in v2 |
|-----------------------|------------------|
| Schema validation | Added runtime Ajv/Zod layer. |
| Error taxonomy | Added `error_taxonomy.json`. |
| Event throttling | Telemetry debounce + batch writes. |
| Secrets rotation | Maintenance agent quarterly task. |
| Rollback process | Snapshot + git tag + dashboard rollback PR. |
| Memory governance | Evergreen/Versioned/Exemplar structure. |
| Watcher behavior | Defined 3-strike logic + signals. |
| CI merge policy | Formal gates and human approvals. |

---

## ✅ Conclusion  

Vibeflow v2 Alignment Plan consolidates every design choice, guardrail, and workflow.  
It eliminates ambiguity between documents and defines a single, testable, self-optimizing orchestration architecture.  
All future design or implementation updates should reference this file as the **canonical system definition**.

---

*Document maintainer:* Vibeflow Orchestrator Project · 2025-10  
*Supersedes:* `vibeflow_complete_reference.md` (archived for historical context)
