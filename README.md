# 🧭 Vibeflow

**Vibeflow** is an opinionated, vendor-agnostic **mission-control system** for orchestrating AI-driven software development.  
It decomposes work from idea → PRD → plan → execution → validation → merge, coordinating multiple LLM environments (CLI and online) safely and deterministically.

---

## 🚀 Project Overview

| Layer | Purpose |
|-------|----------|
| **Control Plane** | Orchestrator · Supervisor · Watcher · Memory · Policies · MCP Server |
| **Execution Plane** | Adapters for CLI tools (Roo, Codex, OpenCode, Kilo) and Web AI Studios (Gemini, DeepSeek) + GraphBit executor |
| **Data Plane** | State · Ledger · Telemetry · Policies · Memory · Rollback |
| **Presentation** | Dashboard + Voice interface (“Vibes”) |

Everything in Vibeflow is **contract-first, traceable, and reversible** — no hidden context, no silent overwrites.

---

## 📂 Repository Documentation Map (current)

### Root-level READMEs
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

- [`vibeflow_complete_reference.md`](docs/arch/vibeflow_complete_reference.md) – *archived early concept reference*  
- [`vibeflow_system_plan_v2_alignment.md`](docs/arch/vibeflow_system_plan_v2_alignment.md) – **canonical system plan (current)**  
  - Includes alignment audit, phases, MCP integration, gates, and rollback policies.

### `/docs/prd/`
Product requirements and strategic addenda.

- [`vibeflow_prd_strategic_technical_addendum.md`](docs/prd/vibeflow_prd_strategic_technical_addendum.md) – PRD + strategic technical notes for Vibeflow.  
- (Add new PRDs here as the system expands.)

---

## 🧠 Quick Start

1. **Read the architecture plan**  
   → [`docs/arch/vibeflow_system_plan_v2_alignment.md`](docs/arch/vibeflow_system_plan_v2_alignment.md)

2. **Understand the PRD context**  
   → [`docs/prd/vibeflow_prd_strategic_technical_addendum.md`](docs/prd/vibeflow_prd_strategic_technical_addendum.md)

3. **Check live subsystems**
   - Alerts & Notifications → [`README_ALERTS.md`](README_ALERTS.md)  
   - Model Panel / Dashboard → [`README_MODEL_PANEL.md`](README_MODEL_PANEL.md)  
   - Pipeline & CI Status → [`README_STATUS.md`](README_STATUS.md)

---

## 🛠️ Planned Folder Refinement (future)
When the system matures, READMEs may be moved under clearer namespaces:

