# Operations Runbook

## Daily Checklist

1. Pull latest `main` and run `npm run generate:manifest`.
2. Review dashboard voice transcripts for misinterpreted intents.
3. Verify `ci-contracts` and `ci-diff-scope` jobs succeeded for active branches.
4. Rotate Browser-Use session if `run_visual_tests` ok-probe fails twice.

## Incident Response

- **Schema Failure:** Execute `npm run validate:schemas` locally, fix offending artefact, commit with repair task ID.
- **Platform Drift:** Update `data/registry/platforms/index.json`, run `npm run generate:manifest`, and trigger `maintenance_agent` repair packet.
- **Watcher Alert:** Inspect `data/state/events.log.jsonl` and run `node scripts/deriveStateFromEvents.mjs` to rebuild snapshots.

## Recovery

1. Restore last snapshot from `data/backups` if backup workflow triggered.
2. Re-run failing skills with `skills/*/*.runner.mjs` using harness `scripts/repair_from_reason.mjs`.
3. Document findings in `docs/updates/<date>.md` (automation will archive during nightly sync).
