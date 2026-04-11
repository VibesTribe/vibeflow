---
name: dashboard-action-bridge
description: Relay action requests from Vibes dashboard chat to Hermes agent via Supabase. Vibes AI answers instantly, Hermes executes actions in background.
---

# Dashboard-to-Hermes Action Bridge

Relays action requests from the Vibes dashboard chat to Hermes agent for execution. Users chat on the dashboard (phone/browser), Vibes AI answers instantly, and Hermes picks up action requests via Supabase.

## Architecture

```
Phone Browser -> Vercel Dashboard VibesChatPanel.tsx
  -> POST /text to pipeline (localhost:8090)
  -> Vibes AI (GLM-5.1) answers instantly with JSON {reply, action_id, audio_id}
  -> Pipeline posts to Supabase agent_messages table
  -> hermes_bridge.py (background daemon) picks up pending messages
  -> Calls Hermes CLI via `script -qc` (PTY required)
  -> Strips ANSI/unicode from Hermes output
  -> Updates Supabase row with {status: "completed", hermes_reply: "..."}
  -> Dashboard polls GET /action/<id> and shows Hermes response
```

## Key Files

- **~/pipeline/server.py** - Pipeline server (port 8090). Endpoints: `/text`, `/chat`, `/audio/<id>`, `/action/<id>`
- **~/pipeline/hermes_bridge.py** - Background daemon, polls Supabase every 30s, calls Hermes CLI
- **~/vibeflow/apps/dashboard/components/vibes/VibesChatPanel.tsx** - Dashboard chat UI
- **~/.hermes/config.yaml** - Must have `auto_approve: true` under `model:` for bridge sessions

## Critical Pitfalls

1. **Supabase agent_messages.message_type has a CHECK constraint** - only accepts "chat", NOT "action_request". Always use `message_type: "chat"`.

2. **Hermes CLI requires a PTY** - cannot call `hermes chat --query` directly. Must wrap with:
   ```
   script -qc "hermes chat --query '...' --yolo" /dev/null
   ```

3. **Hermes output is heavily decorated** - ANSI escape codes, unicode box-drawing chars, carriage returns. Strip all to extract response. Pattern: find lines after "Hermes" header, before "Resume this session".

4. **auto_approve must be true** in ~/.hermes/config.yaml - otherwise security scan blocks commands in bridge sessions with no human to approve.

5. **git push silently fails** on fast-forward errors - ALWAYS `git pull --rebase origin main` before `git push`. Verify with `git log --oneline origin/main..HEAD`.

6. **Ollama fallback model** - gemma4-fast (5.1B) times out at 120s on i5 Sandy Bridge. Use qwen2.5:0.5b (~2-3s response) as fallback.

7. **Vibes AI context enrichment** - `get_system_stats()` runs local commands (df, free, os.getloadavg, pgrep) to give Vibes live disk/RAM/CPU/service info so it can answer status questions without needing Hermes.

8. **CORS must include tunnel origin** - pipeline CORS needs `https://vibes.vibestribe.rocks` or phone browsers get blocked.

9. **Dashboard expects JSON, not headers** - pipeline returns JSON `{reply, timing, action_id, audio_id}`. Old header-based format (X-Transcript, X-Reply) is dead. If dashboard shows "couldn't understand" or "couldn't get a response", the Vercel deploy likely didn't go through - check `git log --oneline origin/main..HEAD`.

10. **Bridge response parsing is fragile** - Hermes CLI output is a mess of ANSI, unicode box-drawing, carriage returns, spinner artifacts. The regex looks for lines after "Hermes" header and before "Resume this session". Test manually with `script -qc` before relying on it.

## Restarting Services

```bash
# Pipeline
pkill -f "python server.py"; sleep 1
cd ~/pipeline && source ~/kokoro-env/bin/activate && source ~/.governor_env && python server.py &>/tmp/pipeline.log &

# Hermes bridge
pkill -f "hermes_bridge"; sleep 1
cd ~/pipeline && source ~/kokoro-env/bin/activate && source ~/.governor_env && python3 hermes_bridge.py &>/tmp/hermes_bridge.log &

# Dashboard (auto-deploys on push)
cd ~/vibeflow && git pull --rebase origin main && git push origin main
```

## Agent Context Continuity

All agent state is synced to a private GitHub repo for portability:
- **Repo:** VibesTribe/vibes-agent-context (private)
- **Sync script:** `~/vibes-agent-context/sync.sh` - copies memories, skills, state and pushes
- **State doc:** `state/current-state.md` - any new agent reads this and is up to speed
- Update current-state.md at end of each session as standard practice
- Memories are plain markdown (~/.hermes/memories/MEMORY.md and USER.md), skills are SKILL.md files

## jOutputMunch Prompt Rules (adopted)

jgravelle's jOutputMunch rules adopted for tighter responses: lead with answer, no filler openers, no closers, plain vocabulary, contractions, short sentences. Core rules at ~/pipeline/joutputmunch-rules/ (if saved). These reduce output tokens 25-40%.

## Performance

- Vibes AI (GLM-5.1 via zai): 6-16s with full context
- Local fallback (qwen2.5:0.5b): 2-3s, no context
- Hermes CLI action: 30-60s per action (full agent session)
- Kokoro TTS: 25-35s (async, doesn't block)
