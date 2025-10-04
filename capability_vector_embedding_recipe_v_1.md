# CapabilityVector Embedding Recipe — v1

Goal: produce a **stable, comparable** text representation of each agent/model so a single embedding captures semantic capability, policy fit, and resource traits for routing. Keep it deterministic and refresh when registry/scorecard changes.

## 1) Assembly (ordered fields → single text)
Concatenate the following with clear labels, omit empty fields, lowercase the labels, keep values verbatim except where noted.

```
platform: <provider>
model: <name>
modalities: text[required]; vision[true|false]; audio[true|false]
supports_tools: <true|false>
max_context_tokens: <int>
rate_limit_rps: <float>
pricing_tokens_per_1k: <float or tiered json>
policy_flags: comma-list (e.g., pii_free, deterministic_ok)
strengths: comma-list (from Analyst aggregates, e.g., "typescript codegen", "strict json")
weaknesses: comma-list (e.g., "long-context reasoning", "hallucination_under_domain:X")
success_prior_by_task_type: json { task_type: success_rate_30d }
latency_profile_ms: json { p50: int, p95: int }
error_mix: json { rate_limit: p, validation: p, other: p }
notes: free text (<= 300 chars, curated)
source_url: <registry.models.source_url>
last_updated: <ISO8601>
```

### Example (assembled)
```
platform: openai
model: gpt-4.1
modalities: text:true; vision:true; audio:false
supports_tools: true
max_context_tokens: 128000
rate_limit_rps: 3
pricing_tokens_per_1k: 0.0025
policy_flags: pii_free, deterministic_ok
strengths: typescript codegen, json io, refactoring
weaknesses: none
success_prior_by_task_type: {"routing_code":0.93,"ui_copy":0.91}
latency_profile_ms: {"p50":16000,"p95":51000}
error_mix: {"rate_limit":0.05,"validation":0.03,"other":0.02}
notes: consistent deterministic behavior at temperature=0.0 for code tasks.
source_url: https://example
last_updated: 2025-10-04T00:00:00Z
```

## 2) Normalization
- Trim whitespace, collapse multiple spaces.
- Lowercase labels only; keep values case‑sensitive.
- Remove control chars and non‑printable bytes.

## 3) Embedding Config
- **Model**: configurable via LiteLLM (default a modern general embedding model; dimension ≥ 1,024 recommended). Store `embedding_dim` alongside vectors.
- **Chunking**: not required; single block targeted < 2k tokens. If larger, summarize `notes/strengths/weaknesses` first.

## 4) Refresh Triggers
- Any change in `registry.models` row for the agent.
- Weekly scorecard rollup.
- Manual admin refresh.

## 5) Storage
- Store raw assembled text (for audit), its SHA256, the vector, and the metadata (`policy_flags`, `resource`).

## 6) QA Checks
- Cosine similarity of same model across days should remain > 0.98 absent material changes.
- If `policy_flags`/resources change, verify similarity delta is reflected (0.02–0.10 typical).

