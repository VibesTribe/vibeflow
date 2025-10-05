# Review Policy (Default)

**Purpose.** Deterministic routing to the right approval gate.

## Mapping
- `ui/*` → `visual_agent` (Visual Agent check ± human approval)
- `merge/*` → `merge_gate` (slice PR requires all green checks)
- `code/*` (non-visual) → `auto`
- otherwise → `human`

## Override
Per task via `TaskContract.review_policy`.
