---
name: vibepilot-model-research
description: Research current AI model landscape and update VibePilot routing config with verified live data. Never trust stale data.
version: 1.0
category: devops
---

# VibePilot Model Landscape Research & Config Update

## When to Use
When the AI model landscape needs updating -- new models released, pricing changed, platforms added/removed. The user expects verified current data, never stale assumptions.

## Why This Exists
Past research (Feb 2026) was wrong based on user testing. The landscape shifts weekly. Every update must be verified from live sources. The config-driven approach means a simple config edit adds new models live in minutes.

## Approach

### 1. Verify, Never Assume
- Do NOT trust training data for pricing, model names, or availability
- Do NOT trust past research docs -- they may be months stale
- Always check live sources first

### 2. Live Sources (in priority order)
1. **OpenRouter rankings** (openrouter.ai/rankings) -- actual usage data, shows what's trending NOW
2. **OpenRouter model pages** (openrouter.ai/{provider}/{model}) -- exact pricing, context, capabilities, benchmarks, free tier availability
3. **Model provider sites** -- web chat access, auth requirements, international access
4. **HuggingFace** -- open weights, model sizes, licenses

### 3. Subagent Strategy
- Use delegate_task with 3 parallel research tasks for speed
- BUT: subagents may return thin results for very new models
- If subagent results are thin, switch to direct browser_navigate to OpenRouter
- Live browsing OpenRouter is the most reliable method for current data

### 4. What to Capture Per Model
Required fields for platforms.json:
- Exact model name and version (verify -- users may say "2.6" when it's actually "3.6 Plus")
- OpenRouter ID and free tier availability
- Input/output pricing per million tokens (context-tiered if applicable)
- Context window size
- Auth methods and international access
- Capabilities (text, code, vision, audio, etc.)
- Key benchmarks (SWE-bench, etc.)
- Rate limits for free tiers
- Web chat URL

### 5. Files to Update
- `config/platforms.json` -- the routing config (increment version, update last_updated)
- `docs/research/llm-api-pricing-model-landscape-{date}.md` -- research doc with verified data
- Commit to a new branch, push if auth available

### 6. Cost Tiers Framework
Always organize models into VibePilot cost tiers:
- Tier 0: Free local (Ollama/Gemma)
- Tier 1: Free web (courier agents, Browser Use)
- Tier 2: Cheap API ($0.05-0.30/M input) -- routine backup
- Tier 3: Quality API ($0.30/M+) -- critical pipeline steps only
- Tier 4: Premium -- NEVER auto-route, explicit human choice only

## GitHub Push Flow
1. Clone repo: `git clone https://github.com/VibesTribe/VibePilot ~/VibePilot`
2. Create dated branch: `git checkout -b research-update-{month}{year}`
3. After commits, set remote with PAT: `git remote set-url origin https://{PAT}@github.com/VibesTribe/VibePilot.git`
4. Push: `git push origin {branch}`
5. **IMMEDIATELY** remove PAT from remote: `git remote set-url origin https://github.com/VibesTribe/VibePilot.git`
6. Remind user to rotate PAT after session -- it's now in chat logs

## Supabase Models Table
The Supabase `models` table already has 15+ entries. Use the sb_secret key with `apikey` header (not Authorization Bearer) to query/update:
```
curl -H "apikey: SEE ~/.governor_env" \
     -H "Authorization: Bearer SEE ~/.governor_env" \
     "https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1/models?select=id,name,status"
```

## Daily Research Prompt
A complete daily research agent prompt lives at `prompts/daily_landscape_researcher.md`. It specifies checking ALL sources, capturing rate limits across ALL time windows (per-min/hr/3hr/5hr/day/week), and the 80% threshold rule. Reference this prompt when running daily scans.

## Pitfalls
- **Model name confusion:** "Qwen 2.6" was actually "Qwen 3.6 Plus". Always verify exact names on official sources.
- **Stale pricing:** Models change pricing frequently. Always check live OpenRouter.
- **Chinese phone walls:** Many platforms (Kimi, GLM-CN, Tongyi) require Chinese phone. Note international access alternatives.
- **Free tier changes:** Free tiers shrink over time. Verify current limits, don't copy from old research.
- **Subagent thin results:** If delegate_task returns minimal data, fall back to direct browser verification immediately.
- **Push may fail:** GitHub auth may not be configured. Commit locally, flag push as TODO.
- **Rate limit time windows matter:** "10 requests" means nothing. Must capture exact window: "10 requests per 3-hour rolling window". Track rolling vs daily resets, timezone of reset.
- **Dead webhooks:** Old GCE webhook still active on repo pointing to cancelled server (34.45.124.117:8080). Audit and clean up stale integrations.
- **PAT in chat:** Never paste PATs in chat. If it happens, rotate immediately after use.
- **OAuth alerts are usually benign:** GitHub emails about third-party OAuth are usually just "Z.ai connected with user:email scope." Check the actual scopes before panicking.
- **Supabase auth quirk:** Use the sb_secret key as BOTH apikey header AND Authorization Bearer. The publishable key gives JWT errors on write operations.
- **Himalaya email:** Installed at ~/.local/bin/himalaya. Gmail auth requires App Password (not regular password) -- 2FA blocks direct login.

## GitHub Security Audit (run alongside research)
When checking the repo, also audit:
```bash
# Token scopes (should be minimal)
curl -sI -H "Authorization: token {PAT}" https://api.github.com/user | grep "x-oauth-scopes"

# Webhooks (check for dead endpoints)
curl -s -H "Authorization: token {PAT}" https://api.github.com/repos/VibesTribe/VibePilot/hooks

# Deploy keys (should be empty unless intentional)
curl -s -H "Authorization: token {PAT}" https://api.github.com/repos/VibesTribe/VibePilot/keys

# Collaborators (should be only VibesTribe)
curl -s -H "Authorization: token {PAT}" https://api.github.com/repos/VibesTribe/VibePilot/collaborators
```
Known: Dead webhook at 34.45.124.117:8080 (old GCE). Update to cloudflared when orchestrator is running.

## Repositories
- VibePilot: https://github.com/VibesTribe/VibePilot
- Config location: config/platforms.json
- Research docs: docs/research/
- Daily research prompt: prompts/daily_landscape_researcher.md
