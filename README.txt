# Vibeflow Workflows (Drop-in)

This zip contains two GitHub Actions you asked for:

1) **Safe Apply from ZIP (Manual)** — `.github/workflows/safe-apply-from-zip.yml`
   - You provide a ZIP URL (containing `__candidates__/` + `manifest.json`).
   - Runs dry-run, validates secrets, then safely applies (with backups) and commits.
   - Requires the **Safe Update Kit** scripts (`scripts/plan-apply.mjs`, `scripts/safe-apply.mjs`, `scripts/validate-secrets.mjs` and a secrets registry).

2) **Status Pulse (Enriched Handoff)** — `.github/workflows/status-pulse.yml`
   - Runs on push and every 2 hours.
   - Generates `docs/reports/repo-snapshot.json` and `docs/updates/handoff_ENRICHED_*.md`.
   - Pulls from `data/state/task.state.json` if present and degrades gracefully.

## Install
- Drop these two files into `.github/workflows/` in your repo and commit.
- Make sure the **Safe Update Kit** is present if you plan to use the Safe Apply workflow.
