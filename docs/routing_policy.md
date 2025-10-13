# Routing Policy (v1)

## Strategy
- Prefer cheapest model that satisfies `confidence >= 0.95`, policy flags, and context window.
- If failure occurs with `E/CONFIDENCE_LOW` or schema mismatch: retry with deterministic params (temperature=0) once; else fallback.

## Mapping (examples)
- task_type: "code"+"backend" → candidates: [openai:gpt-4.1, anthropic:claude-3.7-sonnet, local:lama-3-70b-instruct]
- task_type: "visual" → candidates: [google:gemini-2.0-pro + DevTools MCP]

## Fallbacks
- Rate limit/circuit open → next candidate by score
- Repeatable failure → split task; reduce scope; escalate to human
