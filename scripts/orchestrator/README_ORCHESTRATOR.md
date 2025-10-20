# 🧭 Vibeflow Orchestrator Overview

This directory contains the **core orchestration scaffolding** for Vibeflow — including the configuration, planner dry-run, and early agent stubs.

---

## 📂 Files

| File | Purpose |
|------|----------|
| `orchestrator.config.json` | Environment and model mapping for each task slice |
| `planner_dryrun.mjs` | Reads `tasks_dag_v3.json` and outputs next executable tasks |
| `supervisor_agent.mjs` | Simulated validator for completed task results |
| `tester_agent.mjs` | Simulated tester for validating functional success |
| `executor_router.mjs` | *(to be added)* Routes tasks to real environments (Browser-Use, Roo, Codex, etc.) |

---

## ⚙️ Usage

Run the planner dry-run to verify orchestration readiness:

```bash
node scripts/orchestrator/planner_dryrun.mjs
```

Expected output:
```
✅ Vibeflow Planner Dry Run
3 executable tasks found:
1. [dashboard_layer] T1.2: Integrate ModelView analytics view
2. [dashboard_layer] T1.3: Add ROIView cost calculator view
3. [dashboard_layer] T1.4: Deploy Visual Canvas 2.0
```

---

## 🧩 Next Steps

1. **Implement executor_router.mjs**
   - This will route tasks based on environment mapping (e.g., browser-use, CLI, MCP).
2. **Integrate Supervisor + Tester** into nightly workflow for auto-validation.
3. **Add Planner agent logic** for dynamic DAG updates (confidence propagation).
4. **Connect Supabase telemetry** to record task progress in real-time.

---

_Last updated: 2025-10-20_
