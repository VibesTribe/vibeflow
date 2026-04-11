Perfect — here’s that **handoff sheet** Codex (or any VS Code agent) can use as its human-readable build guide.
Save as:

> `docs/updates/handoff_v5_codex_build.md`

---

# Vibeflow — Codex Build Handoff (System Plan v5)

**Date:** 2025-10-29
**Maintainer:** Vibeflow Orchestrator Project
**Purpose:** Provide Codex with the complete build sequence and context for the Vibeflow system. Each task is atomic, deterministic, and CI-safe.

---

## 🧭 Overview

Vibeflow is a deterministic, vendor-agnostic **mission-control framework** that transforms ideas → PRD → atomic plans → routed executions → validation → merge.

You will build it in vertical slices:

1. **Phase 0:** Dashboard & Telemetry (human visibility first)
2. **Phase A:** Core Control & Safety (orchestrator → router → multi-LLM → watcher → supervisor)
3. **Phase B:** Adapters & Skill Bridge (real web/MCP execution)
4. **Phase C:** Validation & Watcher Safety (tester + repair loops)

All CI workflows and schemas already exist; you will create or update only the files listed per task.

---

## 🧱 Environment / Secrets

Vibeflow uses **GitHub Actions Secrets** (no `.env` file):

```
VIBEFLOW_LLM          # active system model (gemini | deepseek | glm | openrouter | openinference)
GEMINI_API_KEY
DEEPSEEK_API_KEY
GLM_API_KEY
OPENROUTER_API_KEY
OPENINFERENCE_API_KEY
SUPABASE_URL
SUPABASE_KEY
GOOGLE_SESSION_ENC
```

Each workflow inherits them automatically.
If any key is missing or a provider hits quota, `llmProvider.ts` fails gracefully and falls back or enters dry-run mode (no crash).

---

## 🧩 Build Sequence

| Phase  | ID          | Summary                                                  | Key Files                                                                                                        |
| ------ | ----------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **P0** | S5.0 – S5.1 | Dashboard & Telemetry bootstrap                          | `apps/dashboard/*`, `data/state/*`, `data/metrics/run_metrics.json`                                              |
| **PA** | A1.1 – A1.5 | Orchestrator → Router → Multi-LLM → Watcher → Supervisor | `src/core/*`, `src/agents/supervisorAgent.ts`, `src/adapters/llmProvider.ts`, `data/registry/llm_providers.json` |
| **PB** | A2.1 – A2.2 | MCP server + Browser-Use adapter                         | `src/mcp/*`, `skills/visual_execution.runner.mjs`                                                                |
| **PC** | C1.1 – C1.2 | Tester agents + Repair automation                        | `skills/validate_output.runner.mjs`, `skills/run_visual_tests.runner.mjs`, `scripts/repair_from_reason.mjs`      |

---

## 🧩 Key Design Rules

* **TypeScript-first:** `.ts` / `.tsx` only; no `.jsx` or `.js`
* **Atomic regions:** each file uses `@editable:<id>` boundaries
* **Schema validation:** all outputs must pass AJV/Zod via `ci-contracts.yml`
* **Confidence rule:** ≥ 0.95 before orchestration
* **Dry-mode fallback:** no API call errors or workflow halts
* **Dashboard first:** always verify visual state before next phase

---

## 🧠 Execution Flow Reference

```
Idea → ResearchAgent → PRD → PlannerAgent → Orchestrator
→ Router → TaskAgents (Browser-Use / MCP) → Supervisor / Tester
→ CI Merge Gate → Analyst (ROI) → Watcher / Maintenance
```

Dashboard displays `task.state.json`, `events.log.jsonl`, and `run_metrics.json` in real time.

---

## ⚙️ Codex Instructions

For each task in `data/tasks/slices/vibeflow_full_build_v5.json`:

1. **Read context & acceptance criteria.**
2. **Modify only the listed files.**
3. **Commit to branch:** `task/<id>-<slug>`
4. **Run CI checks:** `ci-contracts.yml`, `ci-tests.yml`.
5. **Wait for Supervisor review before merge.**

---

## 🧠 Notes for Codex Runtime

* Always import from existing paths; do not create extra folders.
* Never hard-code API keys; read via `process.env`.
* When in doubt about provider availability, return:

  ```json
  {"provider":"<id>","output":"[dry-run; no API key]"}
  ```
* Dashboard should remain editable and maintainable; no global CSS or layout rewrites.

---

## ✅ Deliverable Outcome

By the end of these slices:

* The dashboard renders and updates live telemetry.
* Orchestrator routes tasks through resilient multi-LLM logic.
* Online task agents execute real work through Browser-Use or MCP.
* Supervisor + Tester validate and merge.
* Watcher + Maintenance provide continuous safety.

---

**End of Handoff — System Plan v5 Build Path**
*(Save as `docs/updates/handoff_v5_codex_build.md` and include in each PR or Codex session.)*
