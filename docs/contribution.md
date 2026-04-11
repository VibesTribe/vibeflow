# Contribution Guide

1. Create branches as `task/<task-id>-<slug>` and ensure the branch metadata matches the lifecycle state.
2. Limit edits to declared `deliverables[]` and stay inside `@editable:<region>` markers.
3. Run `npm run typecheck`, `npm run lint`, and `npm run validate:schemas` before opening a PR.
4. Update `docs/keep_delete_v5.md` if the plan introduces or retires files; rerun the compute script afterwards.
5. Await CI checks (`ci-contracts`, `ci-diff-scope`, `ci-merge-gate`, `ci-tests`, `ci-backup`) and Supervisor approval before merge.
