# Vibes Master TODO List - April 13, 2026

Compiled from: 4 audit reports, GitHub issues (VibePilot #1-3, vibeflow #431-432), Gemini optimization research, and session history.

## DONE (This Session)

1. CORS fixed for dashboard -> API (was blocking Vercel origin)
2. Edge TTS wired as default (1s vs 20s Kokoro, Ava voice selected)
3. Chrome CDP profile fixed - Google cookies copied to chrome-debug
4. BROWSER_CDP_URL set in Hermes .env
5. Gmail verified working through API agent
6. VibesChatPanel deployed with SSE streaming + auto-TTS

## P0 - CRITICAL (Do First)

1. **SUPABASE PURGE** - Delete spam rows (~40 min)
   - security_audit: 48,863 rows (97% "webhook_secret not found" spam)
   - chat_queue: 64,570 rows (old test poem outputs from Feb 2026)
   - failure_records: 1,232 rows (empty glm-5 failure stubs)
   - Frees 99.7% of storage on free tier (115K -> 413 rows)

2. **CLOSE MANIFEST DRIFT ISSUES** - 19+ auto-generated duplicates (#414-#433)
   - Fix the codex branch sync or disable the auto-watcher
   - Merge/close existing drift issues

3. **WEBHOOK SECRET FIX** - vault lookup is broken
   - Go governor spam-creates "secret not found" errors
   - Root cause: vault_secret key missing or lookup path wrong

## P1 - HIGH VALUE

4. **INSTALL OLLAMA + GEMMA 4**
   - Local model for offline fallback + visual QA courier agent
   - gemma4:e4b (9.6GB) or e2b if too slow on i5
   - Already configured as fallback in Hermes config

5. **CLOSE LEARNING LOOP** (VibePilot)
   - Council creates planner rules but supervisor feedback not wired to rule creation
   - Agents learn from failures but never write rules back

6. **TYPE SYSTEM CLEANUP** (VibePilot Go)
   - pkg/types structs vs map[string]any mismatch throughout handlers
   - Proper struct unmarshaling instead of type assertions

7. **MCP SERVER** (VibePilot)
   - Expose Go governor tool registry as MCP server
   - Makes any agent plug in without custom adapters
   - JourneyKits schemas as starting point

8. **CONTEXT COMPACTION** (VibePilot)
   - Auto-generate session summaries after each agent run
   - current_state.md exists but not automated

## P2 - ARCHITECTURE IMPROVEMENTS

9. **YAML DAG WORKFLOWS** (from Archon v5 research)
   - Replace hardcoded routing with declarative YAML pipelines
   - Visual config-driven orchestration (n8n-like)

10. **3-LAYER MEMORY SYSTEM**
    - Short-term (session), mid-term (project), long-term (learned rules)
    - Supabase tables exist but not fully wired

11. **GIT WORKTREES** (from Archon)
    - Isolated workspaces per task instead of branch switching
    - Prevents merge conflicts in parallel agent execution

12. **ADVISOR PATTERN**
    - Senior agent reviews junior agent work before merge
    - Council system exists, needs advisor wiring

13. **JCODEMUNCH MCP INTEGRATION**
    - MCP server for VibePilot agent code analysis

## P3 - DASHBOARD & UX

14. **HERMES STUDIO VIA TUNNEL**
    - Add studio.vibestribe.rocks route to Cloudflare tunnel
    - Link in dashboard admin section
    - Full web UI with sessions, memory, skills, config

15. **HONEYCOMB LANDING PAGE**
    - hub.vibestribe.rocks with project cells
    - Each cell opens project-specific agent dashboard

16. **TOOL PROGRESS DISPLAY**
    - Show agent tool calls in VibesChatPanel (terminal, file ops)
    - SSE emits tool.started/tool.completed but UI only shows text

17. **SSE RECONNECTION LOGIC**
    - Handle dropped connections for long operations
    - Auto-reconnect with session state recovery

## P4 - MAINTENANCE

18. **ROTATE GITHUB PAT**
    - Current token missing read:org scope
    - Generate fresh token with full repo scope

19. **FIX HIMALAYA EMAIL AUTH**
    - Gmail app password expired/never set properly
    - Generate new app password, update himalaya config
    - Enables CLI email from any channel (Telegram + dashboard)

20. **HERMES MEMORY CLEANUP**
    - Currently ~80% full
    - Archive old session data, keep only active facts

21. **DOCKER ON X220**
    - Not installed yet
    - Needed for isolated agent workspaces eventually

22. **TEST ON PHONE BROWSER**
    - Full voice-in/audio-out on mobile Chrome
    - Verify Web Speech API works

---
Total: 6 done, 3 critical, 5 high, 5 architecture, 4 UX, 5 maintenance = 28 items

Constraints: GLM subscription expires May 1 (budget cliff). i5-2520M, 16GB RAM, no GPU, phone tethering.
