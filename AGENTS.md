# Vibeflow Codex Agent Guide

## Project Structure
- Backend: Node.js 20.x + TypeScript, src/ folder
- Frontend: React 18 + Vite + TailwindCSS, frontend/ folder
- Database: Supabase (Postgres-compatible), migrations in supabase/migrations
- Scripts: Utility scripts in scripts/
- Audit Logs: Stored in Supabase table `audit_log`
- Git: Branches are `draft/*`, `ready/*`, `main` (protected)

## Workflow
1. Receive a task in JSON format.
2. Create or update files exactly as listed in `OUTPUT_FORMAT`.
3. Run tests (`npm test`) and migrations (`supabase migration up`).
4. If all tests pass, commit to `draft/<TASK_ID>` with message `[TASK_ID] <short description> via codex`.
5. DO NOT push to `main`. Only human approval merges to `main`.

## Testing Rules
- Every code task must have matching Jest unit tests.
- UI changes must have Playwright tests (placeholder for now).
- Security checks (`npm audit`) must run in CI.

## Safety
- Never delete or overwrite files outside the listed `OUTPUT_FORMAT`.
- Never drop production tables or schemas.
- All secrets must go in `.env`, not in code.
