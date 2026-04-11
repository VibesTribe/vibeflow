# VibesTribe Current State
> Last updated: 2026-04-10 by Hermes (GLM-5.1 via zai)
> Purpose: Any new agent reads this file and knows where everything stands. Update after significant changes.

## System Overview

**Hardware:** ThinkPad X220, i5-2520M (Sandy Bridge, no AVX2), 16GB RAM, ~835GB free disk
**OS:** Linux Mint, CPU governor set to `performance`
**Network:** Phone WiFi tethering (~11 MB/s). Domain: vibestribe.rocks (Namecheap) via Cloudflare tunnel
**Philosophy:** Modular, agnostic, cost-conscious, free-tier leverage. Everything recoverable from GitHub + Supabase.

## Running Services

| Service | Port | Status | Notes |
|---------|------|--------|-------|
| Pipeline server | 8090 | Running | ~/pipeline/server.py, Flask, async JSON+TTS |
| Cloudflare tunnel | - | Running | vibes.vibestribe.rocks → localhost:8090 |
| Ollama | 11434 | Running | qwen2.5:0.5b (only model that works on this CPU) |
| Hermes bridge | - | Running | ~/pipeline/hermes_bridge.py, 30s Supabase poll |

## AI Models

| Model | Role | Speed | Notes |
|-------|------|-------|-------|
| GLM-5.1 (zai) | Hermes primary + Vibes dashboard | 6-16s with context | Main API, can rate limit |
| GLM-5.1 (zai) | Hermes bridge actions | 30-60s | Full Hermes CLI via PTY |
| qwen2.5:0.5b (local) | Pipeline fallback | 2-3s | Tiny, no context, just prevents dead air |
| gemma4-fast (local) | DEAD | 120s+ timeout | Too heavy for i5, do not use |

## Repositories

| Repo | Location | Status |
|------|----------|--------|
| VibePilot | ~/VibePilot (Go) | Broken, needs rebuild per PRD |
| VibeFlow | ~/vibeflow (React/Vite/Vercel) | Dashboard live at vibeflow-dashboard.vercel.app |
| vibes-agent-context | ~/vibes-agent-context | THIS - memories, skills, state |

## Supabase

- Project: ${SUPABASE_PROJECT_ID}
- URL: https://ptnmsspiyqlewxizgimx.supabase.co
- Login: vibesagentai@gmail.com / ${SUPABASE_PW}
- Keys in ~/.governor_env: service key (bypass RLS), anon/publishable key
- RLS: ON
- Tables: tasks(2), models(3), platforms(3), agent_messages (chat type only - CHECK constraint)
- **Egress matters** - use Realtime (websockets) not polling for dashboard

## Pipeline Architecture

```
Phone/Browser → Vercel Dashboard → vibes.vibestribe.rocks → localhost:8090
                                                          → /text (JSON in, JSON out)
                                                          → /chat (audio in, JSON out)
                                                          → /audio/<id> (poll for async TTS)
                                                          → /action/<id> (poll for Hermes result)
                                                          → Supabase agent_messages (bridge to Hermes)
Hermes bridge (hermes_bridge.py) ← 30s poll ← Supabase → calls Hermes CLI → writes result back
```

- Vibes AI gets enriched context: live system stats (disk/RAM/load/services) + Supabase tasks
- Every dashboard message also posted to Supabase for Hermes to act on
- Audio generates async via Kokoro TTS, plays when ready
- STT: Deepgram primary (free 200 min/mo), whisper.cpp fallback

## Key Decisions

1. Direct zai API calls instead of Hermes CLI for pipeline (77s → 6-16s)
2. Async TTS (was blocking, added 25-35s latency)
3. qwen2.5:0.5b as local fallback (gemma4-fast dead on this CPU)
4. CPU governor = performance for AI workloads
5. auto_approve:true in ~/.hermes/config.yaml for bridge automation
6. Hermes CLI needs PTY: `script -qc "hermes chat --query '...' --yolo" /dev/null`
7. jOutputMunch prompt rules adopted for tighter responses
8. jMunch ecosystem (jgravelle) identified for potential context indexing

## Known Issues

- Email (himalaya) broken - Gmail needs app password
- Hermes bridge response parsing is fragile (ANSI/unicode stripping)
- zai API rate limits under heavy testing - falls back to local qwen (no context)
- Git push sometimes fails silently with fast-forward errors - ALWAYS rebase
- GitHub repo case changed: VibesFlow → vibeflow (redirect works)

## Credentials (locations, not values)

- ~/.governor_env - Supabase keys, GLM API key, Deepgram key
- ~/.hermes/auth.json - Hermes credential pool
- ~/.hermes/config.yaml - Model config, auto_approve
- ~/.git-credentials - GitHub PAT (needs rotation)
- Gmail: ${GMAIL_USER} (needs app password for himalaya)

## Next Priorities

1. Fix Hermes bridge response parsing (reliable action handling)
2. Integrate jDocMunch for indexing state/memories/skills
3. Create Gmail app password, fix email
4. Rotate GitHub PAT
5. VibePilot rebuild per PRD (Go, config-driven)
6. Visual QA agent (courier loop)
