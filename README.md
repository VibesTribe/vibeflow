# Vibeflow Control Plane

Vibeflow is a mission-control system that coordinates research, planning, execution, testing, and supervision across LLM agents. The v5 rebuild aligns the repository to the canonical architecture in `docs/system_plan_v5.md` with deterministic manifests, scoped editable regions, and CI enforcement.

## Repository Layout

- `apps/` – Vite dashboard + voice interface for live status and visual review.
- `src/` – Core orchestrator, router, task state, agents, and adapters.
- `skills/` – Declarative skill manifests with lightweight runners.
- `data/` – State snapshots, metrics, platform registry, and digests.
- `scripts/` – Maintenance automation, manifest generation, validation, and diff guards.
- `contracts/` – JSON schemas for packets, events, prompts, and metrics.
- `docs/` – Operator documentation (overview, runbook, tech stack) plus canonical plan.

## Developer Tasks

1. Read `docs/system_plan_v5.md` for architecture, CI rules, and Keep/Delete canon.
2. Run `npm install` and then `npm run generate:manifest` to sync the manifest.
3. Use `npm run compute:keep-delete` before large changes to validate scope.
4. Open branches as `task/<task-id>-<slug>` and keep edits inside declared `@editable` regions.
5. Let CI run `ci-contracts`, `ci-diff-scope`, `ci-merge-gate`, `ci-tests`, and `ci-backup` before merging.

## Quick Commands

```bash
npm run typecheck
npm run lint
npm run validate:schemas
npm run state:derive
```

See `docs/runbook.md` for operational checklists and `docs/contribution.md` for PR requirements.
