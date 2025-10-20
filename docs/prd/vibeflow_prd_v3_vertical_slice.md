# Vibeflow PRD v3 — Vertical Slice Alignment (Canonical)
_This document is the latest canonical version. All future updates will overwrite this file rather than create duplicates._

**Last Updated:** 2025-10-20

---

## 1. Overview
Vibeflow is a modular, vendor-agnostic mission-control system that coordinates AI-driven development workflows from idea → plan → execution → validation → delivery.  
This version (v3) formalizes the **vertical slice task structure** and canonical architecture to align all concurrent and future development.

---

## 2. Current System State

| Layer | Status | Key Components |
|-------|---------|----------------|
| **Control Plane** | Planned | Orchestrator, Supervisor, Planner, Watcher |
| **Execution Plane** | In Progress | Dashboard views (Cardview, ModelView, ROIView) |
| **Data Plane** | Done | Supabase telemetry, roll-up automation |
| **Presentation Layer** | In Progress | Dashboard Canvas, ROI calculator, visual comparison tools |

Automation and Supabase telemetry are stable. Dashboard iterations are live and improving (Phase 2 complete). Agent and orchestration systems are defined but not yet active.

---

## 3. Architecture Plan (Planes)

| Plane | Purpose | Example Components |
|--------|----------|-------------------|
| **Control Plane** | Coordination, scheduling, confidence scoring, concurrency management | Orchestrator, Supervisor, Planner |
| **Execution Plane** | Actual task completion, multi-agent parallelism | Task agents, adapters, LLM environments |
| **Data Plane** | Telemetry, rollback, metrics, audit trail | Supabase, logs, policies, cost tracking |
| **Presentation Layer** | Visualization and interaction | Dashboard UI, Vibes audio/voice, status displays |

---

## 4. Vertical Slice Task DAG (Narrative)

Each slice below is an atomic DAG lane with clear dependencies and 95%+ confidence completion targets.

### Slice 1 — Dashboard Layer
**Status:** In Progress  
**Purpose:** Provide visual intelligence and feedback loops via modular dashboards (Cardview, ModelView, ROIView).  
**Minimal Viable Done:** Live dashboard with 3 functional views and unified manifest structure.  
**Dependencies:** Data Plane (telemetry available)  

**Key Tasks:**
- [x] Cardview and base layout implemented (phase 1)
- [ ] ModelView integration with live analytics
- [ ] ROIView integration with cost calculator
- [ ] Visual Canvas 2.0 for multi-view comparison
- [ ] VibesView (planned, post-phase-3)

---

### Slice 2 — Core Orchestrator Layer
**Status:** Planned  
**Purpose:** Manage task assignment, dependency resolution, and budget confidence routing.  
**Minimal Viable Done:** A single PRD input → task DAG → routed to one environment → validated and merged.  
**Dependencies:** DAG definitions, agent registry.

**Key Tasks:**
- [ ] DAG parsing and token budgeting logic
- [ ] Model selector + fallback policy
- [ ] Task assignment and reassignment engine
- [ ] Confidence propagation (95% rule)
- [ ] Merge + validation hooks

---

### Slice 3 — Agent Layer
**Status:** Planned  
**Purpose:** Provide specialized agents (Supervisor, Tester, Maintenance, Watcher).  
**Minimal Viable Done:** Supervisor + Tester cycle validation for one task path.  
**Dependencies:** Orchestrator + platform adapters.  

**Key Tasks:**
- [ ] Supervisor prompt alignment and role policy
- [ ] Tester validation script for code and output
- [ ] Maintenance auto-patch logic
- [ ] Watcher + Planner auto-sync

---

### Slice 4 — Platform Adapter Layer
**Status:** Planned  
**Purpose:** Connect Vibeflow with Browser-Use, Chrome DevTools MCP, Roo, Codex, and OpenCode environments.  
**Minimal Viable Done:** One functional platform adapter (Browser-Use) executing a simple PRD-based task.  
**Dependencies:** Orchestrator routing logic.  

**Key Tasks:**
- [ ] Browser-Use MCP integration
- [ ] Chrome DevTools MCP integration
- [ ] CLI adapters (Roo, Codex, OpenCode)
- [ ] Adapter registry and validation schema

---

### Slice 5 — Data & Telemetry Layer
**Status:** Done  
**Purpose:** Provide observability, rollback, and cost-awareness for all tasks.  
**Minimal Viable Done:** Supabase telemetry + automated handoff roll-up.  

**Key Tasks:**
- [x] Supabase telemetry configured
- [x] Weekly and nightly handoff roll-up system active
- [x] ROI tracking schema linked
- [x] Snapshot + restore dashboards functional

---

### Slice 6 — Idea & Planning Layer
**Status:** Planned  
**Purpose:** Generate and maintain PRDs, vertical slice DAGs, and strategic plans automatically.  
**Minimal Viable Done:** PRD generator → DAG builder → orchestrator ingest.  

**Key Tasks:**
- [ ] PRD summarizer agent
- [ ] DAG builder from PRD text
- [ ] OpenSpec synchronization
- [ ] Idea ingestion + classification pipeline

---

## 5. What’s Working Now
- Telemetry + Supabase integration  
- Automated roll-up system for handoffs  
- Dashboard Phase 2 deployed (Cardview + ModelView + ROIView structure)  
- Visual Canvas comparison functional  
- Actionable file structure for orchestrator onboarding

---

## 6. Next Objectives
- Complete ModelView + ROIView integration  
- Begin Orchestrator implementation  
- Define Supervisor + Tester agent prompts  
- Implement Browser-Use MCP adapter  
- Generate Idea-to-DAG planner prototype

These will feed the nightly roll-up “Next” section automatically.

---

## 7. Future Slices
- VibesView (audio interface & full overview dashboard)  
- RBAC + skill registry system  
- External collaborator dashboards  
- Multi-repo orchestrator federation  

---

## 8. Related Documents
- `README.md` — root overview and file map  
- `docs/arch/vibeflow_system_plan_v2_alignment.md` — prior system plan  
- `docs/prd/vibeflow_prd_strategic_technical_addendum.md` — superseded version  
- `docs/dashboard/README_OPERATIONS.md` — dashboard automation guide  
- `data/tasks/tasks_dag_v3.json` — machine-readable DAG source
