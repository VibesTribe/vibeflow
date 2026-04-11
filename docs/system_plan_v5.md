# Vibeflow — System Plan v5 (Canonical Build Spec)

> **This document is the single source of truth.**  
> CI auto-generates `data/registry/system_manifest.json` from this file.  
> Any file not listed in the Target File Tree or emitted by the manifest is marked `status:"legacy"` and slated for archive/removal via the Keep/Delete pass.

---

## 0) Purpose & Guarantees

- **95%+ confidence rule:** no task enters a plan < 0.95; the Planner auto-splits until all children ≥ 0.95.  
- **Skills-first execution:** agents call **skills** (manifest + tiny runner), never hard-import adapters.  
- **One event path:** `eventEmitter.emit()` → `data/state/events.log.jsonl` (snapshot derived).  
- **Safe editing everywhere:** **region-scoped patches** only (`@editable … @endeditable` + per-region hashes).  
- **Self-healing:** any failure creates a repair task (mapped from `reason_code`).  
- **TypeScript-first:** UI is `.tsx`; `.jsx/.js` forbidden by CI after migration window.  
- **Final alignment gate:** no merge if schemas/manifest/regions/confidence checks aren’t green.  
- **Deterministic Codex onboarding:** explicit, machine-checkable “Keep / Delete / Create” process (see §7 & §11).

---

## 1) Task Lifecycle → Git Flow

Lifecycle (schema & CI validated):

```
assigned → in_progress → received → supervisor_review → testing → supervisor_approval → ready_to_merge → complete
(+ failed | reassigned | blocked | repaired)
```

**Branches:** Each task works on `task/<task_id>-<slug>`.  
**PR:** opens to `main`; labels must match lifecycle state.  
**Merge:** blocked until all gates pass (see §5).

---

## 2) Atomic Build & Validation Principles

1) No DAG node may have `confidence < 0.95`.  
2) All UI/long-lived files use `@editable:<region>` blocks with **per-region SHA-256** stored in manifest.  
3) CI enforces **scoped patches**: diffs must stay inside declared regions & within declared line budget.  
4) Executable code must be modular; large artefacts (PRD/plan) have **no line limit** but must pass schemas.  
5) Agents validate tools/env before work; missing deps emit `blocked` with `reason_code`.  
6) All outputs (PRD, plan, packets, events) are schema-validated before merge.

---

## 3) Error Recovery & Adaptive Modularity

- Any `failed` event includes `reason_code` (e.g., `E/MISSING_DEP`, `E/SELECTOR_CHANGED`, `E/SESSION_EXPIRED`, `E/SCHEMA_INVALID`).  
- `repairPlannerAgent` maps the reason to a **repair recipe**, creates a high-confidence **repair task** with an OK-probe.  
- Original task becomes `blocked` until repair completes; then auto-requeued.

Large documents (PRD/plan) may be chunked into slices; Planner/CI validate structure, not length.

---

## 4) Role Prompts & Context Injection

Every LLM call is built as
```
[RolePrompt from data/prompts/roles/<agent>.yaml]
+ [SkillContext from skills manifest]
+ [TaskPacket]
```
Schemas enforce `{role, tone, objectives, restrictions, success_criteria}` for each role prompt.

---

## 5) CI Workflows (in `.github/workflows/`)

- **`ci-contracts.yml`** — Validate all schemas: `task_packet`, `event`, `status_transition`, `skill_manifest`, `role_prompt`, `prd_full`, `plan.slice`. Rejects tasks with `confidence < 0.95`.
- **`ci-diff-scope.yml`** — Region-scope check via `scripts/check_safe_diff.mjs`: diffs confined to `@editable:<region>`, line budget respected, region hashes verified.
- **`ci-merge-gate.yml`** — Final alignment: regenerate manifest; forbid edits to files not in manifest or with `locked:true`; reject overwrites newer-than-main; verify lifecycle labels ↔ states; verify skills parity.
- **`ci-tests.yml`** — Smoke tests + OK-probes; typecheck + lint.
- **`ci-backup.yml`** — On merge to `main`, snapshot changed files to `data/backups/YYYYMMDD-HHMM/<path>.bak` (retain last 10).

**Branch protection on `main`:** require all 5 checks, 1 Supervisor approval, linear history, Actions-only merge.

---

## 6) Required Scripts (under `scripts/`)

- `generate_manifest.mjs` — reads this file; emits `data/registry/system_manifest.json` with `{ path, regions:[{id,hash}], assigned_to, locked, last_hash, last_commit, status }`.  
- `validate_json_schemas.mjs` — AJV/Zod runner for `contracts/*.schema.json` against globs.  
- `validate_code_conventions.mjs` — enforces TypeScript + TSX UI; forbids `.jsx/.js` after migration window.  
- `check_safe_diff.mjs` — validates PR diff against editable regions/line budget; recomputes region hashes.  
- `deriveStateFromEvents.mjs` — derives `data/state/task.state.json` from `events.log.jsonl`.  
- `auto_backup.mjs` — stores pre-merge copies under `data/backups/…`.  
- `setFileLock.mjs` — toggle `locked:true|false` per file/region (Supervisor only).  
- `repair_from_reason.mjs` — convert `reason_code` to repair task packet(s), open `task/repair-<id>`.

---

## 7) Target File Tree (~96 files) & KEEP/DELETE/CREATE Canon

> Codex MUST obey this section and §11.  
> Files not listed here are presumed **legacy** (DELETE) unless the manifest marks them `keep:true`.

**Apps / Dashboard (React + Vite)**
```
apps/dashboard/
  index.html
  main.tsx
  components/
    OverviewStrip.tsx
    Timeline.tsx
    AgentView.tsx
    Failures.tsx
    LearningFeed.tsx
    ReadyToMerge.tsx
    TaskCard.tsx
  voice/voice.ts
  styles.css
  vite.config.ts
```
**Core**
```
src/core/
  orchestrator.ts
  planner.ts
  router.ts
  eventEmitter.ts
  taskState.ts
  statusMap.ts
  watcher.ts
  utils.ts
  types.ts
```
**Agents**
```
src/agents/
  researchAgent.ts
  prdAgent.ts
  plannerAgent.ts
  devAgent.ts
  designAgent.ts
  testerAgent.ts
  supervisorAgent.ts
  maintenanceAgent.ts
  analystAgent.ts
  watcherAgent.ts
```
**Adapters & MCP**
```
src/adapters/
  apiAdapter.template.ts
  visualAdapter.template.ts
  graphbitRunner.ts
  mastraRunner.ts
  browserUseRunner.ts
  devToolsRunner.ts
  llmProvider.ts

src/mcp/
  server.ts
  tools/
    runSkill.ts
    queryEvents.ts
    emitNote.ts
    getTaskState.ts
```
**Skills**
```
skills/
  registry.json
  dag_executor.json
  dag_executor.runner.mjs
  visual_execution.json
  visual_execution.runner.mjs
  text_completion.json
  text_completion.runner.mjs
  cli_exec.json
  cli_exec.runner.mjs
  research_probe.json
  research_probe.runner.mjs
  maintenance_update.json
  maintenance_update.runner.mjs
  validate_output.json
  validate_output.runner.mjs
  run_visual_tests.json
  run_visual_tests.runner.mjs
  generate_prd.json
  generate_prd.runner.mjs
```
**Data / State / Registry / Digest**
```
data/state/
  events.log.jsonl
  task.state.json

data/metrics/
  run_metrics.json
  capability_vector.json

data/conversations/.gitkeep

data/registry/
  system_manifest.json     ← auto-generated
  llm_providers.json
  platforms/
    index.json
    EXAMPLE.webstudio.json

data/tasks/
  slices/
    vibeflow_full_build_v5.json

data/digest/
  latest.md
  weekly.md
```
**Contracts**
```
contracts/
  plan.schema.json
  task_packet.schema.json
  event.schema.json
  task_state.schema.json
  run_metric.schema.json
  capability_vector.schema.json
  skill_manifest.schema.json
  status_transition.schema.json
  role_prompt.schema.json
  market_research_report.schema.json
  prd_full.schema.json
  code_conventions.json
```
**Prompts**
```
data/prompts/roles/
  dev_agent.yaml
  research_agent.yaml
  prd_agent.yaml

data/prompts/templates/
  research_agent.prompt.md
  prd_agent.prompt.md
```
**Scripts**
```
scripts/
  nightly/analyst.summarize.mjs
  generate_manifest.mjs
  validate_json_schemas.mjs
  validate_code_conventions.mjs
  check_safe_diff.mjs
  deriveStateFromEvents.mjs
  auto_backup.mjs
  setFileLock.mjs
  repair_from_reason.mjs
```
**Workflows**
```
.github/workflows/
  ci-contracts.yml
  ci-diff-scope.yml
  ci-merge-gate.yml
  ci-tests.yml
  ci-backup.yml
  ci-auto-manifest.yml
  ci-keep-supabase-awake.yml
  ci-nightly-manifest-check.yml
  docs-validate.yml
  pages-deploy.yml
  pages-sync-dashboard.yml
  supervisor-gate.yml
  telemetry-bootstrap.yml
  telemetry-export.yml
  visual-gate.yml
  weekly-handoff.yml
```
**Root**
```
credentials/
  google_session.enc.json
  README.md

docs/
  overview.md
  system_plan_v5.md
  tech-stack.md
  contribution.md
  runbook.md
  architecture.mmd
  updates/handoff_ENRICHED_2025-10-28_20-32.md
  updates/handoff_ENRICHED_2025-10-28_22-29.md
  updates/handoff_ENRICHED_2025-10-29_16-38.md
  updates/handoff_ENRICHED_2025-10-29_18-40.md
  updates/handoff_ENRICHED_2025-10-29_20-31.md
  updates/handoff_v5_codex_build.md

package.json
tsconfig.json
.eslintrc.cjs
.prettierrc
README.md
```

### 7.1 KEEP / DELETE / CREATE — exact file names (auto-generated list)
Because the `codex` branch currently contains ~400+ files, the precise **Keep/Delete/Create** list must be computed *against the live tree* to avoid mistakes.

**Do this ONCE on the `codex` branch:**
```bash
node scripts/compute_keep_delete.mjs --from-branch=codex --target-tree=docs/system_plan_v5.md --out=docs/keep_delete_v5.md
```
This writes an authoritative file list to `docs/keep_delete_v5.md` with three sections:
```
KEEP:
  <exact/path/a>
  <exact/path/b>
DELETE:
  <exact/legacy/file/1>
  <exact/legacy/file/2>
CREATE:
  <exact/new/file/alpha>
  <exact/new/file/beta>
```
> CI requires that `docs/keep_delete_v5.md` exists and is up-to-date; Codex must follow it exactly. Backups occur automatically on deletion/merge.

We include `scripts/compute_keep_delete.mjs` in §11 and CI checks in §5.

---

## 8) File/Region Metadata & Patch Rules

All managed files start with:
```ts
/**
 * vibeflow-meta:
 * id: <path>
 * task: <task_id>
 * regions:
 *   - id: <region-id>
 *     hash: <sha256-8>
 * locked: true
 * last_commit: <short-sha>
 */
```
Editable zones:
```tsx
{/* @editable:region-id */}
… code …
{/* @endeditable */}
```
PR body MUST include:
```json
{"task_id":"<id>","edit_scope":"<region-id>","lines_changed":N}
```

---

## 9) Planner, PRD & Plan Schemas

- **PRD** must validate `contracts/prd_full.schema.json`.  
- **Plan** must validate `contracts/plan.slice.schema.json` and contain **only ≥ 0.95** tasks with explicit `depends_on`.  
- **Task packets** include `deliverables[]` (the only files a task branch may create/modify).

---

## 10a) Skills & Adapters

- `skills/registry.json` is the source of truth for runnable capabilities.  
- Each skill has a small `.runner.mjs` (≤ ~100 lines).  
- Adapters in `src/adapters/` provide concrete implementations used by runners.  
- Swapping Browser-Use/Playwright or GraphBit/Mastra requires **only** manifest edits + OK-probes.

---

## 10b) Web-Studio Execution, Voice & MCP

- **Web Studios:** `visual_execution` skill uses Browser-Use/Playwright with a shared Google session (`credentials/google_session.enc.json`) to submit prompts to online AI studios. Full HTML + screenshots saved under `data/conversations/<platform>/<task_id>/`.
- **MCP/IDE:** `cli_exec` skill calls local/remote MCP tools (VS Code/Cursor/OpenCode) for CLI/FS/code actions.
- **Vibes Voice:** `apps/dashboard/voice/voice.ts` turns voice into **scoped UI tasks** (region-patches), then standard lifecycle (branch → CI → merge).

---

## 10c) Core Internal Agents & End-to-End Flow

**Agents**
- `research_agent` (core) → market report (schema-validated)  
- `prd_agent` (core) → PRD + acceptance criteria  
- `planner_agent` (core) → plan with all tasks ≥ 0.95  
- `orchestrator_core` (core) → schedules ready nodes, routes via Router  
- `dev/design/testing/supervisor` (exec/gates) → build/test/approve  
- `maintenance_agent` (ops) → add/swap skills/platforms/keys safely  
- `analyst_agent` (ops) → metrics/ROI nightly  
- `watcher_agent` (ops) → loop/drift/timeouts; emits reassignment

**Flow**: Research → PRD → Plan → Dispatch (web studio / MCP) → Supervisor/Test → Final Gate → Merge → Analyst/ROI updates.

---

## 10d) Model & Platform Registry (Routing Source of Truth)

`data/registry/platforms/index.json` records providers, sessions, limits, OK-probes, recent success and latency; Router and Watcher use it for selection and health.

---

## 10e) Router Policy

Scoring:
```
score = w1*priority + w2*confidence + w3*provider_success_rate
        - w4*expected_latency - w5*token_over_budget_penalty
```
Hard constraints: provider supports task mode, deps satisfied, limits respected; prefer higher success rate for similar tasks.

---

## 10f) ROI Calculator & Run Metrics

Nightly `analyst_agent` updates `data/metrics/run_metrics.json` with `roi_score` (blend of success, cost, latency, rework). Router biases by rolling ROI.

---

## 10g) Prompt/Template Management

Role prompts in `data/prompts/roles/*.yaml`; task templates in `data/prompts/templates/*`.  
`maintenance_agent` opens scoped PRs (`prompt:update`), CI validates schemas, Supervisor approves. Orchestrator reloads prompts per dispatch.

---

## 10h) LLM API & Session Management

Secrets are never in repo. Required: `OPENROUTER_API_KEY`, `DEEPSEEK_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `GOOGLE_SESSION_ENC`.  
`maintenance_agent` runs `secrets:rotate`, re-runs OK-probes.

---

## 10i) Watcher Responsibilities

Monitors long runs for loops/timeouts/captchas/stalls; emits `reassigned` with `reason_code`; feeds stats to platform registry.

---

## 10j) Human Visual Review

Tasks with `task.type:"visual_change"` require a human checkpoint (diff screenshots, checklist). Supervisor approval before `ready_to_merge`.

---

## 10k) Graph Execution Engine (Core Skill)

The `dag_executor` skill is **core** and required. Defaults to **GraphBit**; **Mastra** is supported.  
- Category: `core` in `skills/registry.json`  
- Runners: `graphbitRunner.ts`, `mastraRunner.ts`  
- Maintenance may switch `engine` via `maintenance_update` + OK-probe.  
- CI enforces existence, prohibits deletion, and tests parity via `okProbe.dag_executor`.

---

## 11) Codex Execution Instructions (Authoritative)

1. **Read** this file (`docs/system_plan_v5.md`).  
2. **Run** `node scripts/generate_manifest.mjs` → creates/refreshes `data/registry/system_manifest.json`.  
3. **Run** `node scripts/compute_keep_delete.mjs --from-branch=codex --target-tree=docs/system_plan_v5.md --out=docs/keep_delete_v5.md`.  
4. **Delete** every path listed under `DELETE:` in `docs/keep_delete_v5.md` (CI auto-backs up).  
5. **Create/Regenerate** every path under `CREATE:` exactly as specified.  
6. **Modify only** files and regions declared in the task’s `deliverables[]` and `edit_scope`.  
7. **Open PRs** from `task/<id>-<slug>` with `edit_scope` + `lines_changed` metadata.  
8. **Do not merge**; wait for CI and Supervisor approval.

> Any deviation is blocked by CI. Placeholders or prose where JSON is required are rejected.

---

## 12) Appendices (Schemas, Conventions, Commands)

- **Schemas:** `contracts/*.schema.json` (PRD, plan.slice, role_prompt, event, status transitions, skills, metrics).  
- **Conventions:** `contracts/code_conventions.json` (TypeScript-first; UI `.tsx`; forbid `.jsx/.js` post-migration).  
- **Quick Commands:**
  ```bash
  # Generate manifest
  node scripts/generate_manifest.mjs

  # Compute exact keep/delete/create for this branch
  node scripts/compute_keep_delete.mjs --from-branch=codex --target-tree=docs/system_plan_v5.md --out=docs/keep_delete_v5.md

  # Validate schemas
  node scripts/validate_json_schemas.mjs contracts/*.json data/**/*.json

  # Check diff scope on PR
  node scripts/check_safe_diff.mjs
  ```

**End of System Plan v5**  
_Changes to this document require PR label `doc:update` and Supervisor approval._
