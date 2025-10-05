# Branch Flow

- Work: `task/*` → PR to `slice/*`
- Gate: `slice/*` must be green (lint, typecheck, tests, schema‑validate)
- Merge: `slice/*` → `main` via `merge_gate` approval
