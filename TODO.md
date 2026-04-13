# Vibes Master TODO List - Updated April 14, 2026

Compiled from: 4 audit reports, GitHub issues (VibePilot #1-3, vibeflow #431-432), Gemini optimization research, and session history.

---

## DONE (Verified Working)

### Core Infrastructure
- [x] **CORS fixed** -- wildcard + localhost origins, Vercel can reach API
- [x] **Edge TTS as default** -- 1s generation, en-US-AvaNeural voice, dual-engine (kokoro still available)
- [x] **Chrome CDP profile** -- cookies copied to chrome-debug, BROWSER_CDP_URL set
- [x] **Hermes API running** -- port 8642, Gemini 2.5 Flash primary, OpenRouter fallback chain, Ollama offline backup
- [x] **Cloudflare tunnel** -- api.vibestribe.rocks -> 8642, vibes.vibestribe.rocks -> 8090, systemd user service
- [x] **Vercel deployed** -- vibeflow-dashboard.vercel.app serving committed dist/
- [x] **VibesChatPanel** -- SSE streaming + auto-TTS + Web Speech API voice input
- [x] **Hermes Studio** -- running on port 3002, enhanced mode (sessions/memory/skills/config)

### P0 Critical (Completed April 14)
- [x] **Supabase purge** -- deleted 114,665 rows (48,863 security_audit + 64,570 chat_queue + 1,232 failure_records). All 3 tables at 0 rows. Dashboard verified unaffected.
- [x] **Manifest drift cleanup** -- closed ~150 auto-generated spam issues. Clean slate: 2 vibeflow audits + 3 VibePilot issues remain.
- [x] **Webhook secret fix** -- disabled webhooks in system.json (were enabled without VAULT_KEY, spamming 48K failed reads)

### P4 Maintenance (Completed April 14)
- [x] **Himalaya email auth** -- Gmail app password "vibes" generated, plugged into config. IMAP reads + SMTP sends working. Email sent to Allyson with TODO list.
- [x] **Ollama local backup** -- qwen2.5:0.5b installed (not gemma 4 -- free API access is more efficient, qwen is lighter for offline fallback on i5)

### Config & Architecture
- [x] **Multi-provider fallback** -- Gemini -> OpenRouter free tier -> Ollama local
- [x] **Email CLI** -- himalaya working for read + Python smtplib for send

---

## TODO

### P1 - HIGH VALUE

1. **CLOSE LEARNING LOOP** (VibePilot)
   - Council creates planner rules but supervisor feedback not wired to rule creation
   - `get_planner_rules` RPC exists, write-back does not
   - Agents learn from failures but never write rules back

2. **TYPE SYSTEM CLEANUP** (VibePilot Go)
   - `map[string]any` still in handlers_council, handlers_maint, handlers_plan
   - Proper struct unmarshaling instead of type assertions

3. **MCP SERVER** (VibePilot)
   - Expose Go governor tool registry as MCP server
   - Makes any agent plug in without custom adapters
   - No MCP files exist yet in governor

4. **CONTEXT COMPACTION** (VibePilot)
   - Summary structs exist in decision.go but not automated
   - Auto-generate session summaries after each agent run

### P2 - ARCHITECTURE IMPROVEMENTS

5. **YAML DAG WORKFLOWS** (from Archon v5 research)
   - Replace hardcoded routing with declarative YAML pipelines
   - Visual config-driven orchestration (n8n-like)
   - Currently only CI workflows exist, no runtime DAG

6. **3-LAYER MEMORY SYSTEM**
   - Short-term (session), mid-term (project), long-term (learned rules)
   - Supabase tables exist but not fully wired

7. **GIT WORKTREES** (from Archon)
   - Isolated workspaces per task instead of branch switching
   - Currently only main worktree on research-update-april2026 branch

8. **ADVISOR PATTERN**
   - Senior agent reviews junior agent work before merge
   - Council system exists, needs advisor wiring

9. **JCODEMUNCH MCP INTEGRATION**
   - MCP server for VibePilot agent code analysis
   - Not started

### P3 - DASHBOARD & UX

10. **HERMES STUDIO VIA TUNNEL**
    - Add studio.vibestribe.rocks route to Cloudflare tunnel config
    - Link in dashboard admin section
    - Full web UI with sessions, memory, skills, config

11. **HONEYCOMB LANDING PAGE**
    - hub.vibestribe.rocks with project cells
    - Each cell opens project-specific agent dashboard
    - No route exists yet

12. **TOOL PROGRESS DISPLAY**
    - Show agent tool calls in VibesChatPanel (terminal, file ops, browser)
    - SSE emits tool.started/tool.completed but UI only renders text deltas
    - 0 references in current component

13. **SSE RECONNECTION LOGIC**
    - Only 1 minimal reconnect reference
    - Need auto-reconnect with session state recovery for long operations

### P4 - MAINTENANCE

14. **ROTATE GITHUB PAT**
    - Current token has repo, workflow scopes (missing read:org)
    - Generate fresh token with full scopes

15. **HERMES MEMORY CLEANUP**
    - Trim PERSONA.md and memory entries to essentials

16. **DOCKER ON X220**
    - Not installed, needed for isolated agent workspaces eventually

17. **TEST ON PHONE BROWSER**
    - Full voice-in/audio-out on mobile Chrome
    - Verify Web Speech API works reliably

---

## Summary

| Category | Done | Remaining |
|----------|------|-----------|
| Core Infrastructure | 8 | 0 |
| P0 Critical | 3 | 0 |
| P1 High Value | 1 (Ollama) | 4 |
| P2 Architecture | 0 | 5 |
| P3 Dashboard & UX | 0 | 4 |
| P4 Maintenance | 2 | 4 |
| **Total** | **14** | **17** |

**Constraints:** GLM subscription expires May 1 (budget cliff). i5-2520M (no AVX2), 16GB RAM, no GPU, phone tethering. Free tier everything.
