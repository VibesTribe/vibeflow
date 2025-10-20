# Vibeflow Orchestration Scaffold
Coordinating layer for the Vibeflow meta-orchestrator, including contract schemas, planner outputs,
supervisor guardrails, orchestrator readiness checks, and dashboard state sync.
## Getting Started
```bash
npm install
npm run context:all            # repo snapshot + OpenSpec digest
npm run ideas:build-prd -- example-app
npm run planner:generate       # writes data/taskpackets/<idea>/<slice>/*
npm run supervisor:gate -- example-app
npm run orchestrator:ready -- example-app
npm run orchestrator:assign -- example-app
npm run telemetry:update
npm run pages:sync             # mirrors data/state -> docs/state for Pages dashboard
```
Run tests with Jest:
```bash
npx jest --runInBand
```
Sample ideas live under `data/ideas/`. The repository currently ships the `example-app`
(shared context backbone) and `maintenance-agent` (automation bootstrap) slices so every
stage of the pipeline has concrete artifacts.
## Trusted Tools
Payload examples live under `examples/`.
```bash
npm run tools:run -- --payload examples/openspec.example.json
npm run tools:run -- --payload examples/visual-checklist.example.json
```
## Key Directories
- `planner/examples/` - slice configs that expand into `data/taskpackets/<idea>/<slice>/*`
- `data/taskpackets/` - current plan DAG + atomic task packets (confidence >= 0.95)
- `data/state/` - runtime JSON for orchestrator/supervisor/task state
- `data/tasks/queued/` - agent-ready assignment payloads grouped by idea
- `data/metrics/` - ROI + run metrics cached for the dashboard
- `docs/state/` - GitHub Pages mirror (sync via `npm run pages:sync`)
- `docs/reports/` - repo snapshots, supervisor approvals, visual audits
- `docs/prd/` - strategic PRD addenda and canonical constraints
- `scripts/` - context writers, telemetry updater, planner tooling, guardrails, orchestrator checks
- `src/` - orchestrator, supervisor, memory, and guardrail TypeScript modules
- `dashboard/` - static dashboard that reads `docs/state/**`
## Automation Scripts
| Script | Purpose |
|--------|---------|
| `npm run context:snapshot` | Generate `docs/reports/repo-snapshot.json` |
| `npm run context:openspec` | Build `docs/updates/OPEN_SPEC_DIGEST.md` + JSON index |
| `npm run planner:generate` | Expand planner config into `data/taskpackets/<idea>/<slice>/*` |
| `npm run ideas:build-prd -- <idea>` | Regenerate `prd.summary.json` using research + analyst artifacts |
| `npm run ideas:validate -- <idea>` | Schema-validate research, analyst, PRD, and status artifacts |
| `npm run ideas:promote -- <idea> <stage>` | Advance status after approvals |
| `npm run supervisor:gate -- <idea>` | Validate planner output vs PRD/registries and write supervisor report |
| `npm run orchestrator:ready -- <idea>` | Ensure supervisor approval + plan assets exist before dispatch |
| `npm run orchestrator:assign -- <idea> [--dry-run]` | Build agent-facing assignment JSON + update assignment log |
| `npm run task:claim -- [--idea <idea>]` | Claim the next queued assignment and create an in-progress record |
| `npm run task:complete -- --idea <idea> --task <task> --status <status>` | Record task completions with tokens/cost metadata (supports dry runs, requeue on failure) |
| `npm run test:claim -- [--idea <idea>]` | Claim queued validation assignments for tester agents |
| `npm run test:complete -- --idea <idea> --task <task> --attempt <n> --test-attempt <m> --status <status>` | Record validation results (requeues on failure) |
| `npm run telemetry:update` | Aggregate assignment/supervisor logs into `data/state` + metrics |
| `npm run telemetry:bootstrap` | Ensure Supabase telemetry tables/views exist and are indexed |
| `npm run maintenance:import-digest` | Pull latest knowledgebase digest into maintenance inbox |
| `npm run pages:sync` | Copy `data/state/**` into `docs/state/**` for Pages hosting |
| `npm run guardrails:secrets` | Ensure env vars exist in `data/tasks/secrets-registry.json` |


## Rate Limits
- Configure per-platform usage caps in `data/policies/rate_limits.json` (web studios, free APIs, paid APIs, and CLI paths).
- Modes: `enforce` pauses assignments when the rolling window is exceeded, `monitor` logs warnings only, and `disabled` removes the rule.
- The dispatcher automatically skips rate-limited platforms and falls back according to `PLATFORM_FALLBACKS`; telemetry reflects the active counters so dashboards can surface pauses.

## Maintenance
- Drop curated updates or digests into `data/maintenance/inbox/` (the import script copies the latest knowledgebase digest automatically).
- `npm run maintenance:import-digest` expects `KNOWLEDGEBASE_ROOT` pointing at the knowledgebase repo checkout.
- The maintenance agent converts high/medium priority items into actionable tasks for catalog and routing updates.

## Idea Lifecycle
1. **Research** - Author `data/ideas/<id>/research.brief.json` and run `npm run ideas:validate -- <id>`.
2. **Analyst Review** - Record verdict in `analyst.review.json`, referencing the research SHA.
3. **PRD Approval** - Run `npm run ideas:build-prd -- <id>` to refresh constraints, then `npm run ideas:promote -- <id> prd_approved`.
4. **Planner** - Execute `npm run planner:generate -- --input planner/examples/<slice>.json`; status moves to `plan_generated`.
5. **Supervisor Gate** - Run `npm run supervisor:gate -- <id>` to cross-check plan vs PRD/registries. Success writes `docs/reports/supervisor/<id>.json` and promotes status to `supervisor_ready`.
6. **Orchestrator** - Run `npm run orchestrator:ready -- <id>` and `npm run orchestrator:assign -- <id>` to confirm supervisor approval, build assignments, and queue work.
Use `npm run ideas:promote -- <id> <next_stage>` only after the relevant guard scripts succeed.
