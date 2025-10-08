# NBE-01 — No-Blind-Edits Protocol (Repo Copy)

**Goal:** Deliver *full-file* ZIP updates without risking loss of existing functionality.

## How to use this kit
1. Put replacement files under `__candidates__/` **mirroring your repo paths**. Example:  
   `__candidates__/src/orchestrator/routing.ts` → will replace `src/orchestrator/routing.ts`.
2. Copy `config/secrets-registry.example.json` to `config/secrets-registry.json` and fill with your env names.
3. (Optional) Add `baseline_hash` in `manifest.json` for any file you want locked to a known version.
4. Dry run: `node scripts/plan-apply.mjs`
5. If all green: `node scripts/safe-apply.mjs`  
   - Originals are backed up to `backups/<timestamp>/` before replace.
