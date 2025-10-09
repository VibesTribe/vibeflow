# Vibeflow Architecture Overview (Anti-Drift Edition)

**Date:** 2025-10-09

## Visual & UX Testing — canonical stack
**No Playwright.** We use:
- **Browser‑Use MCP** for high‑level flows.
- **Chrome DevTools MCP** for low‑level assertions (console/network/a11y).

Visual tasks always require **human approval** even after automated checks pass.
Artifacts:
- `docs/visual/checklists/<task_id>.md`
- `docs/reports/visual/<task_id>.json` & `.md`
- CI: `.github/workflows/visual-gate.yml`
