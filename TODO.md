     1|# Vibes Master TODO List - Updated April 15, 2026
     2|
     3|Compiled from: 4 audit reports, GitHub issues (VibePilot #1-3, vibeflow #431-432), Gemini optimization research, and session history.
     4|
     5|---
     6|
     7|## DONE (Verified Working)
     8|
     9|### Core Infrastructure
    10|- [x] **CORS fixed** -- wildcard + localhost origins, Vercel can reach API
    11|- [x] **Edge TTS as default** -- 1s generation, en-US-AvaNeural voice, dual-engine (kokoro still available)
    12|- [x] **Chrome CDP profile** -- cookies copied to chrome-debug, BROWSER_CDP_URL set
    13|- [x] **Hermes API running** -- port 8642, Gemini 2.5 Flash primary, OpenRouter fallback chain, Ollama offline backup
    14|- [x] **Cloudflare tunnel** -- api.vibestribe.rocks -> 8642, vibes.vibestribe.rocks -> 8090, systemd user service
    15|- [x] **Vercel deployed** -- vibeflow-dashboard.vercel.app serving committed dist/
    16|- [x] **VibesChatPanel** -- SSE streaming + auto-TTS + Web Speech API voice input
    17|- [x] **Hermes Studio** -- running on port 3002, enhanced mode (sessions/memory/skills/config)
    18|
    19|### P0 Critical (Completed April 14)
    20|- [x] **Supabase purge** -- deleted 114,665 rows (48,863 security_audit + 64,570 chat_queue + 1,232 failure_records). All 3 tables at 0 rows. Dashboard verified unaffected.
    21|- [x] **Manifest drift cleanup** -- closed ~150 auto-generated spam issues. Clean slate: 2 vibeflow audits + 3 VibePilot issues remain.
    22|- [x] **Webhook secret fix** -- disabled webhooks in system.json (were enabled without VAULT_KEY, spamming 48K failed reads)
    23|
    24|### P4 Maintenance (Completed April 14)
    25|- [x] **Himalaya email auth** -- Gmail app password "vibes" generated, plugged into config. IMAP reads + SMTP sends working. Email sent to Allyson with TODO list.
    26|- [x] **Ollama local backup** -- tested qwen3:4b + qwen3-vl:4b, 2 tok/s on i5 (unusable). Deleted both. Daemon stopped/disabled. Cloud free tiers preferred when online.
    27|- [x] **Cloudflare tunnel** -- running as systemd service, api.vibestribe.rocks + vibes.vibestribe.rocks
    28|- [x] **GitHub PAT** -- rotated April 15, full scopes
    29|
    30|### Config & Architecture
    31|- [x] **Multi-provider fallback** -- Gemini -> OpenRouter free tier -> Ollama local
    32|- [x] **Email CLI** -- himalaya working for read + Python smtplib for send
    33|- [x] **MCP Client Integration (Phase 1)** -- mark3labs/mcp-go SDK wired into governor. Registry connects to approved servers, discovers tools, registers them in ToolRegistry. ContextBuilder injects MCP tool list into agent context. Clean build, all tests pass.
    34|- [x] **MCP Tools Installed** -- jcodemunch-mcp 1.43.0, jdocmunch-mcp 1.8.0, jdatamunch-mcp 0.8.3 (via pipx, ready in ~/.local/bin/)
    35|- [x] **YAML DAG Workflows** -- DAG engine (engine.go, workflow.go, registry.go), code-pipeline.yaml, governor loads and executes on startup
    36|- [x] **Governor v2.0.0 rebuilt** -- compiled from current main, DAG+MCP+gitree+realtime all active, 7.5MB RAM
    37|- [x] **WYNTK doc updated** -- architecture tree, knowledge layer, governor internal structure, file paths all current
    38|- [x] **Hermes memories backed up** -- agent/HERMES_MEMORIES.md in VibePilot repo, recoverable from GitHub
    39|- [x] **Context knowledge layer** -- tier0-static.md (single source of truth), knowledge.db (2.3MB SQLite), boot.md (~2,804 tokens), auto-rebuild on commit
    40|
    41|---
    42|
    43|## TODO
    44|
    45|### P1 - HIGH VALUE
    46|
    47|1. **CLOSE LEARNING LOOP** (VibePilot)
    48|   - Council creates rules from review concerns (works)
    49|   - Supervisor feedback does NOT create rules (broken)
    50|   - Needs multi-level rules: agent (how to code), planner (how to split tasks), orchestrator (how to route)
    51|   - Current system is flat "Avoid: X" strings -- needs structured auto-improvement
    52|   - Blocked on Archon/JourneyKits/AgentSkills architecture review
    53|
    54|2. **TYPE SYSTEM CLEANUP** (VibePilot Go)
    55|   - `map[string]any` still in handlers_council, handlers_maint, handlers_plan
    56|   - Proper struct unmarshaling instead of type assertions
    57|
    58|3. **MCP SERVER -- DONE (Phase 2, April 15)** (VibePilot)
    59|   - ~~USING MCP servers: connect to jCodeMunch and other MCP servers~~ DONE (Phase 1)
    60|   - **AS an MCP server**: expose tool registry (git ops, task mgmt, routing, council reviews) so any agent plugs in (Phase 2, not started)
    61|
    62|4. **CONTEXT COMPACTION** (VibePilot)
    63|   - Summary structs exist in decision.go but not automated
    64|   - Auto-generate session summaries after each agent run
    65|
    66|### P2 - ARCHITECTURE IMPROVEMENTS
    67|
    68|5. **YAML DAG WORKFLOWS** -- DONE (April 14)
    69|   - DAG engine built (governor/internal/dag/: engine.go, workflow.go, registry.go)
    70|   - code-pipeline.yaml defines runtime pipeline stages
    71|   - Governor loads and executes DAG on startup
    72|   - Visual config-driven orchestration foundation in place
    73|
    74|6. **3-LAYER MEMORY SYSTEM -- DONE (April 15)**
    75|   - Short-term (session), mid-term (project), long-term (learned rules)
    76|   - Supabase tables exist but not fully wired
    77|
    78|7. **GIT WORKTREES** (from Archon) -- IN PROGRESS
    79|   - Git only allows one branch active per directory -- parallel agents would overwrite each other's files
    80|   - Each task needs its own folder so multiple agents can work simultaneously
    81|   - `git worktree add ~/VibePilot-work/task-42 task/42` pattern
    82|   - Essential once parallel agent execution is active
    83|
    84|8. **ADVISOR PATTERN**
    85|   - Senior agent reviews junior agent work before merge
    86|   - Council system already covers complex multi-model review
    87|   - Supervisor covers single-model QC before testing
    88|   - May already be adequately handled by existing supervisor + council flow
    89|
    90|9. **JCODEMUNCH MCP INTEGRATION**
    91|   - MCP tools installed (jcodemunch, jdocmunch, jdatamunch via pipx)
    92|   - Governor MCP client wired and building clean
    93|   - Ready to enable: just add to system.json mcp_servers section
    94|   - Not yet enabled in config (install now, use later)
    95|
    96|### P3 - DASHBOARD & UX
    97|
    98|10. **HERMES STUDIO VIA TUNNEL**
    99|    - Add studio.vibestribe.rocks route to Cloudflare tunnel config
   100|    - Link in dashboard admin section
   101|    - Full web UI with sessions, memory, skills, config
   102|
   103|11. **HONEYCOMB LANDING PAGE**
   104|    - hub.vibestribe.rocks with project cells
   105|    - Each cell opens project-specific agent dashboard
   106|    - No route exists yet
   107|
   108|12. **TOOL PROGRESS DISPLAY**
   109|    - Show agent tool calls in VibesChatPanel (terminal, file ops, browser)
   110|    - SSE emits tool.started/tool.completed but UI only renders text deltas
   111|    - 0 references in current component
   112|
   113|13. **SSE RECONNECTION LOGIC**
   114|    - Only 1 minimal reconnect reference
   115|    - Need auto-reconnect with session state recovery for long operations
   116|
   117|### P4 - MAINTENANCE
   118|
   119|14. **ROTATE GITHUB PAT** -- DONE (April 15)
   120|
   121|15. **HERMES MEMORY CLEANUP**
   122|    - Trim PERSONA.md and memory entries to essentials
   123|
   124|16. **DOCKER ON X220**
   125|    - Not installed, needed for isolated agent workspaces eventually
   126|
   127|17. **TEST ON PHONE BROWSER**
   128|    - Full voice-in/audio-out on mobile Chrome
   129|    - Verify Web Speech API works reliably
   130|
   131|---
   132|
   133|## Summary
   134|
   135|| Category | Done | Remaining |
   136||----------|------|-----------|
   137|| Core Infrastructure | 10 | 0 |
   138|| P0 Critical | 3 | 0 |
   139|| P1 High Value | 4 (MCP server + memory done) | 2 |
   140|| P2 Architecture | 3 (DAG + memory + MCP tools) | 2 |
   141|| P3 Dashboard & UX | 0 | 4 |
   142|| P4 Maintenance | 5 | 2 |
   143|| **Total** | **25** | **9** |
   144|
   145|**Constraints:** GLM subscription expires May 1 (budget cliff). i5-2520M (no AVX2), 16GB RAM, no GPU, phone tethering. Free tier everything.
   146|