# 🧭 Vibeflow

**Vibeflow** is an opinionated, vendor-agnostic **mission-control system** for orchestrating AI-driven software development.  
It decomposes work from idea → PRD → plan → execution → validation → merge, coordinating multiple LLM environments (CLI and online) safely and deterministically.

---

## 🚀 Project Overview

| Layer | Purpose |
|-------|----------|
| **Control Plane** | Orchestrator · Supervisor · Watcher · Planner · Memory · Policies · MCP Server |
| **Execution Plane** | Adapters for CLI tools (Roo, Codex, OpenCode, Kilo) and Web AI Studios (Gemini, DeepSeek) + GraphBit-inspired DAG executor |
| **Data Plane** | State · Ledger · Telemetry · Policies · Rollback |
| **Presentation** | Dashboard + Voice interface (“Vibes”) |

Everything in Vibeflow is **contract-first, traceable, and reversible** — no hidden context, no silent overwrites.

---

## 📂 Repository Documentation Map (Current)

### Root-Level READMEs

| File | Purpose |
|------|----------|
| [`README.md`](README.md) | ← you are here — overall guide and directory map |
| [`README_ALERTS.md`](README_ALERTS.md) | Brevo / Supabase alerting and notification setup |
| [`README_HANDOFF_SNIPPET.md`](README_HANDOFF_SNIPPET.md) | Template for project hand-off or daily summaries |
| [`README_MODEL_PANEL.md`](README_MODEL_PANEL.md) | Notes for the model-status / analytics panel UI |
| [`README_STATUS.md`](README_STATUS.md) | CI pipeline or orchestration status reference |
| [`README.txt`](README.txt) | Legacy plain-text readme (safe to archive once confirmed duplicate) |

---

### `/docs/arch/`
Architecture and systems design.

| File | Purpose |
|------|----------|
| [`vibeflow_complete_reference.md`](docs/arch/vibeflow_complete_reference.md) | *archived early concept reference* |
| [`vibeflow_system_plan_v2_alignment.md`](docs/arch/vibeflow_system_plan_v2_alignment.md) | **previous system plan (v2)** — superseded by v3 vertical-slice PRD |

---

### `/docs/prd/`
Product requirements and strategic addenda.

| File | Purpose |
|------|----------|
| [`vibeflow_prd_v3_vertical_slice.md`](docs/prd/vibeflow_prd_v3_vertical_slice.md) | **canonical PRD + vertical-slice alignment (latest)** |
| [`vibeflow_prd_strategic_technical_addendum.md`](docs/prd/vibeflow_prd_strategic_technical_addendum.md) | superseded reference (v2) |

---

### `/data/tasks/`
Machine-readable task DAGs and orchestration metadata.

| File | Purpose |
|------|----------|
| [`tasks_dag_v3.json`](data/tasks/tasks_dag_v3.json) | **authoritative DAG for orchestrator / roll-up / agents** |
| *(older task or state JSONs)* | archived or intermediate state files |

---

### `/dashboard/`
Presentation and visualization layer.

| Path | Description |
|------|--------------|
| `/stable/Cardview` | Primary dashboard view (in progress) |
| `/stable/ModelView` | Analytics view (phase 2 placeholder) |
| `/stable/ROIView` | ROI calculator view (phase 2 placeholder) |
| `/tools/visualCanvas.html` | Visual Canvas 2.0 — compare any 2 or 3 dashboard views |
| `/merge/` | Generated dashboards and templates |
| `/scripts/dashboard/` | Merge and restore utilities |

---

### `/scripts/`
Automation scripts and orchestrator utilities.

| Path | Description |
|------|--------------|
| `/scripts/dashboard/mergeBuilder.js` | Merges stable dashboards into unified sets |
| `/scripts/dashboard/restoreSnapshot.js` | Restores backed-up dashboards from `.snapshots/` |
| `/scripts/rollupHandoffs.js` | Rolls up daily enriched handoffs into weekly summaries |
| `/scripts/cleanupOldHandoffs.js` | Removes old enriched handoffs post-merge |
| `/scripts/orchestrator/` | (Planned) Orchestrator logic and assignment routines |

---

### `/docs/updates/`
System updates, changelogs, and automation handoffs.

| File | Purpose |
|------|----------|
| `handoff_week_<date>.md` | Weekly rolled-up summary (auto-generated) |
| `latest.md` | Latest daily summary |
| `ANTI_DRIFT_CHANGELOG.md` | Manual anti-drift notes and audit trail |
| `OPEN_SPEC_DIGEST.md` | Auto-generated OpenSpec deltas |
| `handoff_template.md` | Header template for handoff roll-ups |

---

## 🧠 Quick Start

1. **Review the architecture plan (v2 reference)**  
   → [`docs/arch/vibeflow_system_plan_v2_alignment.md`](docs/arch/vibeflow_system_plan_v2_alignment.md)

2. **Read the canonical PRD (v3)**  
   → [`docs/prd/vibeflow_prd_v3_vertical_slice.md`](docs/prd/vibeflow_prd_v3_vertical_slice.md)

3. **Check the task DAG for orchestrator context**  
   → [`data/tasks/tasks_dag_v3.json`](data/tasks/tasks_dag_v3.json)

4. **Review dashboard operations**  
   → [`dashboard/README_OPERATIONS.md`](dashboard/README_OPERATIONS.md)

5. **Confirm automation is active**  
   - `.github/workflows/dashboard-stable-backup.yml` – backs up dashboards on push  
   - `.github/workflows/dashboard-weekly-prune.yml` – prunes old snapshots  
   - `.github/workflows/handoff-rollup.yml` – merges daily handoffs into weekly summaries  

---

## 🛠️ Planned Folder Refinement (Future)
As the system matures, READMEs and scripts may be reorganized under clearer namespaces:

