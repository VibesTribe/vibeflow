# AGENTS — Vibeflow Rules (All Backends)

## Ground rules
- PR-only; never push to main.
- No-Blind-Edits (NBE-01): keep diffs minimal; preserve exports/APIs; never guess paths.
- Secrets: only use names listed in `secrets-registry.json`. Don’t invent env names.
- OpenSpec: edit `openspec/changes/**` only. Promotion to `openspec/specs/**` happens via the promotion workflow.

## Required steps for any change
1) If it’s a spec change, create/update `openspec/changes/<slug>.md` (title, rationale, acceptance criteria, touched components).
2) After code/spec edits, let CI regenerate:
   - `node scripts/generate-openspec-digest.mjs`
   - `node scripts/generate-enriched-handoff.mjs`
3) Commit message:
   - `docs(openspec): ...` for spec docs
   - `chore(agent): ...` for code touch
4) Open a PR; pass Supervisor/Visual/Test gates.

## Execution backends
- **VSCode Codex (no API key):** run task packets locally; open PR.
- **OpenCode / Copilot:** run inside GitHub; open PR.
