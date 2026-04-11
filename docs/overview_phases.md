Perfect. Below is a **Phase Summary Map** — your high-level dependency graph and canonical reference for Codex, dashboard documentation, or any future agent (Supervisor, Planner, or Builder).

Save this as:

> `docs/overview_phases.md`

---

# Vibeflow Build Phases — System Plan v5 Overview

**Purpose:**
Define every major phase, its goal, sub-tasks, and how it connects to others.
This map represents the official vertical-slice build order for the Vibeflow ecosystem.

---

## 🧭 Phase Overview Table

| Phase  | Focus                           | Description                                                                                           | Depends On             | Outputs To                                         |
| :----- | :------------------------------ | :---------------------------------------------------------------------------------------------------- | :--------------------- | :------------------------------------------------- |
| **R0** | Idea → PRD → Plan Generator     | Captures an idea, runs research + PRD + planner agents to produce validated `plan.slice.json`.        | none                   | **Phase M** (Mission Loop Automation)              |
| **P0** | Dashboard & Telemetry Bootstrap | Builds visual Mission Control dashboard and telemetry state for all later phases.                     | none                   | Provides UI and Supabase state to all other phases |
| **PA** | Core Control & Safety           | Implements Orchestrator, Router, Multi-LLM Provider, Watcher, and Supervisor.                         | P0                     | Provides runtime event chain to Phase M            |
| **PB** | Adapters & Skill Bridge         | Connects Orchestrator to external web/MCP tools (Browser-Use, OpenCode, etc.).                        | PA                     | Enables execution of tasks from Phase M            |
| **PC** | Validation & Watcher Safety     | Adds Tester Agents, Repair & Rollback automation.                                                     | PB                     | Continuous self-healing feedback to dashboard      |
| **PM** | Mission Loop Automation         | Wires everything together: Auto Runner, MCP `/run-task`, scheduled workflow, and dashboard task loop. | R0 + PA + PB + PC + P0 | Full end-to-end autonomous Vibeflow operation      |

---

## 🧩 Phase Summaries

### **R0 — Idea → PRD → Plan Generator**

* **Goal:** From a user’s idea submission, create a research report, PRD, and atomic vertical slice plan.
* **Agents Involved:** `researchAgent`, `prdAgent`, `plannerAgent`, `supervisorAgent`.
* **Artifacts:**

  * `/data/ideas/<slug>/idea_packet.json`
  * `/data/research/market_research_report.json`
  * `/data/prd/prd_full.json`
  * `/data/plan/plan.slice.json`
* **Feeds Into:** Mission Loop (`PM`) and Dashboard “Idea → Plan” view.

---

### **P0 — Dashboard & Telemetry Bootstrap**

* **Goal:** Provide human-visible Mission Control UI.
* **Artifacts:**

  * `/apps/dashboard/**` (React/Tailwind UI)
  * `/data/state/task.state.json`, `/data/state/events.log.jsonl`, `/data/metrics/run_metrics.json`
* **Output:** real-time Supabase telemetry updates for all phases.

---

### **PA — Core Control & Safety**

* **Goal:** Enable the Orchestrator → Router → Supervisor chain with multi-LLM fallback.
* **Agents:** Orchestrator, Router, Supervisor, Watcher.
* **Key Files:**

  * `src/core/orchestrator.ts`
  * `src/core/router.ts`
  * `src/adapters/llmProvider.ts`
  * `data/registry/llm_providers.json`
* **Ensures:** No pipeline halts due to API/credit issues.

---

### **PB — Adapters & Skill Bridge**

* **Goal:** Execute tasks on real AI web studios or local MCP tools.
* **Agents:** Browser-Use Adapter, MCP Server.
* **Files:**

  * `src/mcp/server.ts` + `src/mcp/tools/*`
  * `skills/visual_execution.runner.mjs`
* **Feeds:** Execution results back to Supervisor/Testers.

---

### **PC — Validation & Watcher Safety**

* **Goal:** Add testing, validation, and rollback recovery.
* **Agents:** TesterAgent (code + visual), Watcher, Maintenance.
* **Artifacts:**

  * `skills/validate_output.runner.mjs`
  * `skills/run_visual_tests.runner.mjs`
  * `scripts/repair_from_reason.mjs`
* **Outcome:** automatic retries and continuous health monitoring.

---

### **PM — Mission Loop Automation**

* **Goal:** Stitch everything into a self-driving system.
* **Components:**

  * `scripts/orchestrator/auto_runner.mjs` (auto-queue watcher)
  * MCP `/run-task` endpoint
  * `.github/workflows/mission-loop.yml` (GitHub automation)
  * Dashboard “Run Task” & live task feed
* **Effect:** Zero CLI interaction; Vibeflow runs tasks automatically via Actions.

---

## 🔄 Data Flow Diagram

```
[IdeaForm] 
   ↓ (R0.2 ResearchAgent)
[market_research_report.json]
   ↓ (R0.3 PRDAgent + Supervisor)
[prd_full.json]
   ↓ (R0.4 PlannerAgent)
[plan.slice.json]
   ↓ (PM auto_runner)
[Orchestrator → Router → Adapter → Supervisor/Testers]
   ↓
[data/state/task.state.json]
   ↓
[Mission Control Dashboard]
```

---

## 🧠 Dependency Map (simplified)

```
R0 → PM
P0 → PA → PB → PC → PM
```

All phases converge in **PM**, producing the final autonomous loop.

---

## ✅ Current Status (2025-10-29)

| Phase |   Status   | Notes                                          |
| ----- | :--------: | :--------------------------------------------- |
| R0    |  ⬜ planned | Idea→PRD→Plan slice defined                    |
| P0    | ✅ complete | Dashboard functional                           |
| PA    | ✅ complete | Core orchestrator, router, LLM provider done   |
| PB    |  ⬜ partial | MCP + Browser-Use integration next             |
| PC    |  ⬜ partial | Tester agents exist; repair automation pending |
| PM    |   ⬜ next   | Mission loop wiring ready for build            |

---

**Usage:**
This map lives at `docs/overview_phases.md` and should be referenced in:

* `README.md` (project overview link)
* `dashboard` help modal (“Phases Overview”)
* PR or Action logs to show progress by phase.

---

**End of File — Vibeflow System Plan v5 Phase Map**
