# OpenMemory / Mem0 — Integration Notes

## Setup
1) Log into app.openmemory.dev with your Mem0 account.
2) Install the MCP extension for your IDE (Cursor/Windsurf/Claude Code) via their dashboard.
3) In your IDE, send explicit memory commands to the agent (e.g., "Remember we use pytest").

## Vibeflow Bridge
- `src/adapters/memory/OpenMemoryAdapter.ts` is a thin adapter for server-side processes.
- Task Agents in IDEs use MCP to write memories. Vibeflow can later sync those into its store and surface them in Planner/Orchestrator prompts.

## Roadmap
- Webhook/API ingestion when available.
- Dashboard Sidebar buttons: Pull/Push memories.
- Show memory chips on tasks (e.g., "eslint-airbnb", "psycopg2", "pytest").
