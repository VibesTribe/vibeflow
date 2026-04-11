---
name: openrouter-cost-audit
description: "Audit OpenRouter API spend, check credit/usage, compare model pricing, find free alternatives, and switch models to reduce cost. Use when user mentions cost concerns, subscription limits, or model switching."
tags: [openrouter, cost, budget, model-switching, free-tier, pricing]
triggers:
  - User mentions cost concerns, budget, or running out of credit
  - Need to check what model is running and how much it costs
  - Want to switch to a cheaper or free model
  - OpenRouter subscription ending or credit running low
  - Need to enumerate free models available
---

# OpenRouter Cost Audit & Model Switching

## When to Use
- User is concerned about API costs
- Need to verify what model is actually being used and its cost
- Want to find free or cheaper alternatives
- Subscription is ending and need to plan migration

## Phase 1: Check Current Model and Spend

### Step 1: What model am I running?
```bash
grep -A5 '^model:' ~/.hermes/config.yaml
```

### Step 2: Check OpenRouter credit and usage
```bash
# Keys in .env may show as *** (redacted by tooling). Use awk to extract real values.
curl -s https://openrouter.ai/api/v1/auth/key \
  -H "Authorization: Bearer $(awk -F= '/^OPENROUTER_API_KEY=/{print $2}' ~/.hermes/.env)"
```

Key fields in response:
- `usage` — total spend in USD
- `usage_daily` — today's spend
- `usage_weekly` / `usage_monthly` — period spend
- `limit` — spending cap (null = unlimited)
- `is_free_tier` — whether on free tier
- `expires_at` — key expiration

### Step 3: Check current model pricing
```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $(awk -F= '/^OPENROUTER_API_KEY=/{print $2}' ~/.hermes/.env)" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
# Search for specific model
target = 'claude-opus'  # change as needed
for m in data.get('data', []):
    if target in m.get('id', '').lower():
        inp = float(m.get('pricing', {}).get('prompt', '0')) * 1_000_000
        out = float(m.get('pricing', {}).get('completion', '0')) * 1_000_000
        print(f\"{m['id']}: \${inp:.2f}/Mtok in, \${out:.2f}/Mtok out\")
"
```

## Phase 2: Find Free & Cheap Alternatives

### List all free models
```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $(awk -F= '/^OPENROUTER_API_KEY=/{print $2}' ~/.hermes/.env)" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
free = [m for m in data.get('data', [])
        if float(m.get('pricing', {}).get('prompt', '1')) == 0
        and float(m.get('pricing', {}).get('completion', '1')) == 0]
for m in sorted(free, key=lambda x: x['id']):
    ctx = m.get('context_length', '?')
    print(f\"  {m['id']} (ctx: {ctx})\" )
"
```

### List cheapest non-free models (under $1/Mtok input)
```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $(awk -F= '/^OPENROUTER_API_KEY=/{print $2}' ~/.hermes/.env)" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
cheap = []
for m in data.get('data', []):
    inp = float(m.get('pricing', {}).get('prompt', '999'))
    out = float(m.get('pricing', {}).get('completion', '999'))
    if 0 < inp * 1e6 < 1.0:
        cheap.append((inp * 1e6, out * 1e6, m['id'], m.get('context_length', '?')))
cheap.sort()
for inp, out, mid, ctx in cheap[:20]:
    print(f\"  {mid}: \${inp:.3f}/\${out:.3f} per Mtok (ctx: {ctx})\")
"
```

## Phase 3: Check Other API Keys

API keys in .env may be redacted in display. Use awk to check real values:

```bash
# Check key lengths and prefixes (not full keys)
for keyname in GLM_API_KEY OPENROUTER_API_KEY GOOGLE_API_KEY GEMINI_API_KEY KIMI_API_KEY; do
  len=$(awk -F= "/^${keyname}=/{print length(\$2)}" ~/.hermes/.env)
  prefix=$(awk -F= "/^${keyname}=/{print substr(\$2,1,4)}" ~/.hermes/.env)
  if [ -n "$len" ] && [ "$len" -gt 5 ]; then
    echo "$keyname: present (len=$len, starts=$prefix...)"
  fi
done
```

### Test if a key actually works
```bash
# GLM/z.ai
curl -s https://api.z.ai/api/paas/v4/chat/completions \
  -H "Authorization: Bearer $(awk -F= '/^GLM_API_KEY=/{print $2}' ~/.hermes/.env)" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4-plus","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'

# Gemini
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$(awk -F= '/^GEMINI_API_KEY=/{print $2}' ~/.hermes/.env)" | head -5
```

## Phase 4: Switch Model

### Via config.yaml
```bash
# Change default model
sed -i 's|default: .*|default: z-ai/glm-5|' ~/.hermes/config.yaml
```

### Via Hermes CLI
```
/model z-ai/glm-5
```

## Pitfalls

- **Hermes .env read_file and grep redact keys to `***`** — use `awk -F=` on the raw file to get real values
- **Environment variables are NOT inherited by terminal subprocesses** — must read from file directly
- **Free models on OpenRouter may have `:free` suffix** — include it in the model name
- **Daily spend rate × 30 = your monthly bill** — check `usage_daily` and multiply
- **Some keys expire silently** — always test with a real API call, not just length check
- **Multiple Supabase service keys may exist** (e.g., governor_env vs hermes .env) — they may have different permissions or point to different project instances if the project was recreated
- **`is_free_tier: false` does NOT mean you're on a paid plan** — it means the key itself isn't rate-limited to free tier. You still pay per token.

## Cost Reference (as of 2026-04)

| Model | Input/Mtok | Output/Mtok | Notes |
|-------|-----------|------------|-------|
| claude-opus-4.6 | $5.00 | $25.00 | Very expensive |
| claude-sonnet-4 | $3.00 | $15.00 | Still pricey |
| glm-5 | $0.72 | $2.30 | Good value |
| glm-4.7-flash | $0.06 | $0.40 | Near-free |
| glm-4.5-air:free | $0 | $0 | Free tier |
| gemma-4-31b:free | $0 | $0 | Free tier |
| qwen3-coder:free | $0 | $0 | Good for code |
