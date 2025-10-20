# 📘 Vibeflow PRD Guide

This document explains how Vibeflow’s PRD and task DAG system work together.  
It serves as the reference for **maintaining, updating, or regenerating** the canonical PRD and its linked orchestration data.

---

## 🧭 Purpose

Vibeflow uses a **two-tier PRD system**:
1. **Human-readable PRD** → `vibeflow_prd_v3_vertical_slice.md`  
   - Contains narrative context, architecture, dependencies, and “Next Objectives.”
   - Written for planners, supervisors, and human maintainers.
2. **Machine-readable DAG** → `tasks_dag_v3.json`  
   - Provides the orchestrator with atomic task definitions, dependencies, and statuses.
   - Drives automation, roll-up summaries, and orchestration task routing.

These files are **kept in sync** by design.  
Future agents or workflows that update them should modify both together in one atomic commit.

---

## 🧱 File Map

| File | Purpose |
|------|----------|
| [`vibeflow_prd_v3_vertical_slice.md`](vibeflow_prd_v3_vertical_slice.md) | Canonical, human-facing PRD (narrative + structure) |
| [`../../data/tasks/tasks_dag_v3.json`](../../data/tasks/tasks_dag_v3.json) | Machine-readable DAG (execution graph) |
| [`README_PRD.md`](README_PRD.md) | This guide (how to update and sync PRD + DAG) |

---

## 🧩 Update Policy

| Type of Update | What to Change | Example |
|----------------|----------------|----------|
| **New feature / slice** | Add new section to PRD under “Vertical Slice Task DAG” and new slice node in DAG JSON | Adding `VibesView` slice |
| **Status change** | Update the `status` in DAG JSON (`planned`, `in_progress`, `done`) and mirror in PRD | Mark Dashboard Layer `in_progress` |
| **Confidence level** | Adjust numeric `confidence` in DAG JSON; mention rationale in PRD notes | Raise from 0.8 → 0.9 after test success |
| **Dependency change** | Update `depends_on` array in DAG JSON only | Linking `Orchestrator` after `Data` slice completion |
| **Next Objectives** | Edit the “Next Objectives” section in PRD | Add new week’s milestones |

---

## 🔄 Automation Integration

The **nightly handoff roll-up** uses these files as source data:

- `tasks_dag_v3.json` → Provides active, pending, and planned tasks  
- `vibeflow_prd_v3_vertical_slice.md` → Supplies contextual “What’s Working” and “Next Objectives”

Whenever either file changes:
- The roll-up merges the updates into `latest.md` and `handoff_week_<date>.md`.  
- Supabase telemetry records the new DAG state for audit.  
- Orchestrator agents will soon query these files directly to assign work.

---

## ⚙️ Regeneration Rules

- Future PRD versions will **overwrite** this file and the DAG pair (`v4` and beyond).  
- Legacy versions (v2, v3) are preserved for context but marked as superseded.  
- Only one canonical version (latest) should exist at any time.

---

## ✅ Best Practices

1. **Edit the PRD first** — clarify purpose and dependencies.  
2. **Then update the DAG** — reflect changes programmatically.  
3. **Commit both together** — to maintain sync across automation.  
4. **Verify nightly roll-up output** (`latest.md` and `handoff_week_*.md`) to confirm ingestion.

---

## 🔮 Future Extension

- Automatic PRD → DAG generation by the Planner agent.  
- DAG → execution routing by the Orchestrator agent.  
- Integrated PRD visualizer on the dashboard for progress tracking.  
- VibesView slice to provide audio-visual summaries of PRD status.

---

_Last synchronized: 2025-10-20_  
