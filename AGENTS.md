# Vibeflow Agent Guide

## Project Structure
- `docs/` – PRDs, contracts, policies, dashboard specs, generated reports
- `planner/examples/` – slice configs expanded into `data/taskpackets/<idea>/<slice>/*`
- `data/` – runtime state (`state/`, `metrics/`, `taskpackets/`) mirrored into `docs/state/`
- `openspec/changes/` – OpenSpec proposals produced by trusted tools
- `scripts/` – context writers, planner CLI, telemetry, guardrails, orchestrator checks, trusted tool dispatcher
- `dashboard/` – static Pages UI wired to JSON state sources
- `docs/visual/checklists/` – visual audit outputs from Browser-Use + DevTools MCP runs

Sample ideas: `example-app` (shared context backbone) and `maintenance-agent` (automation bootstrap). Keep both pipelines in sync when updating artifacts and assignment queues.

## Daily Workflow
1. Pull latest `codex`; run `npm install` if dependencies shifted.
2. Refresh shared context (`npm run context:all` and `npm run pages:sync`). Agents consume `docs/reports/repo-snapshot.json`, `docs/updates/OPEN_SPEC_DIGEST.md`, and `data/state/*.json`.
3. Regenerate the PRD when research or analyst artifacts change: `npm run ideas:build-prd -- <idea>` and validate with `npm run ideas:validate -- <idea>`.
4. Generate/update the active slice plan: `npm run planner:generate -- --input planner/examples/<slice>.json`. Planner refuses to run unless status >= `prd_approved`.
5. Run the supervisor gate before orchestration: `npm run supervisor:gate -- <idea>`. Plans without high confidence, unknown models, or unsafe deliverables are rejected and status remains `plan_generated`.
6. Verify orchestrator readiness: run `npm run orchestrator:ready -- <idea>` and queue work with `npm run orchestrator:assign -- <idea>` (use `--dry-run` to preview).
7. Read the latest PRD (`data/ideas/<id>/prd.summary.json`) and routing policies before execution. Task packets live under `data/taskpackets/<idea>/<slice>/<task>.json`.
8. Visual/UI validation must route through Browser-Use + Chrome DevTools MCP. Generated checklists land in `docs/visual/checklists/` and require explicit human approval before merge.
9. After supervisor approval and automated checks, sync dashboard state (`npm run pages:sync`) so GitHub Pages reflects the latest metrics before opening PRs.

### Task Agent Workflow
- Claim the next queued assignment with `npm run task:claim -- --idea <idea_id>` (use `--task` for a specific packet or `--dry-run` to preview).
- Work from the suggested branch scaffold (`agent/<idea>/<slice>/<task>/attempt-XX`) while reserving `test/...` and `review/...` branches for downstream validation and supervisor stages.
- Record the outcome with `npm run task:complete -- --idea <idea_id> --task <task_id> --status <success|failed>`; include `--prompt-tokens`, `--completion-tokens`, `--cost`, `--reason`, or `--meta key=value` so ROI metrics stay accurate even on free tiers.
- `task:complete` clears the in-progress record and lets the orchestrator requeue automatically on failure (including credit exhaustion fallbacks).

### Test Agent Workflow
- Inspect queued validations via `npm run test:claim -- --list` and claim the next test assignment when ready.
- Work from the suggested `test/...` branch (create it from the implementation branch if needed) and execute each validation command listed in the payload.
- Capture pass/fail evidence and summarize results using `npm run test:complete -- --idea <idea_id> --task <task_id> --attempt <n> --test-attempt <m> --status <success|failed>` (add `--notes` for links or log files).
- Failed runs automatically requeue the next test attempt so fixes can be revalidated without rebuilding the assignment.

### Maintenance Agent Workflow
- Run `npm run maintenance:import-digest` to sync the latest knowledgebase digest into `data/maintenance/inbox/`.
- Review generated tasks (high/medium priority items) and decide whether to update the model registry, rate limits, or platform policies.
- After acting on a task, archive or remove the corresponding inbox file so it is not reprocessed.

## Trusted Tools
- Dispatch via `npm run tools:run -- --tool OpenSpecWriter@v1 --args payload.json`.
- Available tools:
  - `OpenSpecWriter@v1`: writes `openspec/changes/<slug>.md` summaries.
  - `VisualChecklist@v1`: writes `docs/visual/checklists/<task_id>.md` for Browser-Use runs.
- Compose payloads with structured JSON (see `examples/`). Keep arguments deterministic and idempotent.\n\n## Testing & Validation
- Unit tests: Jest (`npx jest --runInBand`). Add coverage for every code task.
- Visual checks: Browser-Use + DevTools MCP (no Playwright). Output JSON/MD artifacts under `docs/reports/visual/` and `docs/visual/checklists/`.
- Supervisor policies live in `docs/supervisor_validation_checklist.md`; fail fast and reroute via orchestrator if any checkpoint is unmet.

## Branch & CI Rules
- Work locally on `codex` unless a task contract specifies a slice branch.
- CI workflows: `.github/workflows/ci-test.yml`, `supervisor-gate.yml`, `visual-gate.yml`, `promote-to-approved.yml`, `promote-to-main.yml`.
- Promotion flow: `agent/*` -> `testing` -> `approved` -> `main` after automated gates pass and human visual approval is recorded.

## Safety & Secrets
- Never invent file paths; rely on `docs/reports/repo-snapshot.json`, planner packets, or `src/memory/snapshotLoader`.
- Secrets live in `data/tasks/secrets-registry.json` and Supabase config; do not hard-code API keys.
- Use `npm run guardrails:secrets SECRET_NAME ...` to verify env vars appear in the registry before referencing `process.env.*`.
- Watcher + reassignment policies are enforced; document every reroute in assignment logs (`data/state/assignment.log.json`).

## Idea Pipeline Dependencies
1. Research agent produces `data/ideas/<id>/research.brief.json` and sets stage to `research_completed`.
2. Analyst agent approves via `analyst.review.json` and promotes to `analyst_approved`.
3. PRD generator builds `prd.summary.json`; once approved run `npm run ideas:promote -- <id> prd_approved`.
4. Planner requires `prd_approved`; successful generation marks `plan_generated` and writes task packets.
5. Supervisor gate requires `plan_generated` and promotes to `supervisor_ready` when checks pass.
6. Orchestrator must ensure `status.stage >= supervisor_ready` (use `npm run orchestrator:ready -- <id>`), then queue assignments with `npm run orchestrator:assign -- <id>` so task agents receive payloads.













