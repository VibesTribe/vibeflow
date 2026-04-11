# Tech Stack

- **Runtime:** Node.js 20+, TypeScript 5, Vite 5 for dashboard builds.
- **UI:** React 18 with region-scoped components under `apps/dashboard`.
- **Automation:** Node scripts in `scripts/` for manifests, schema validation, diff checks, and backups.
- **Schemas:** JSON Schema (draft-07) validated via AJV to guarantee structured artefacts.
- **Storage:** JSONL logs and manifests under `data/state`, `data/metrics`, `data/registry`.
- **Voice Interface:** Lightweight interpreter in `apps/dashboard/voice/voice.ts` to translate spoken commands into workflow actions.
- **MCP Integration:** `src/mcp/server.ts` exposes CLI tools for skills to execute localized actions.
