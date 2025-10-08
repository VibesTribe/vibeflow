# Reassignment Policy

## Goals
- Minimize wasted attempts while maintaining quality and speed.
- Prefer **continuity** (same chat/thread) when beneficial; avoid **thrash** (excess model hopping).

## When to Reassign
- Supervisor rejection (`validation_passed=false`) for reasons: quality below DoD, truncated output, schema mismatch.
- Platform signals: rate limit, policy block, downtime, excessive latency.
- Watcher detects loops/drift/quota exhaustion (in MCP runtime).

## How to Reassign
- First retry on **same platform/model** with enriched prompt/context (attempt_idx+1).
- On second failure, select from Top‑N candidates using routing score with penalties applied.
- Carry forward: failure reasons, artifacts, and **chat continuity hint** where possible.

## Scoring Adjustments
- `continuity_bonus`: +B if **same chat** can be reused (context savings)
- `reassignment_penalty`: +P per failed attempt on that platform/model for this task in the last N minutes
- `cooldown`: temporarily reduce agent's capability score after repeated failures

## Telemetry
Every event records: timestamp, action, platform, model, chat_url, reason, notes, est_tokens, counterfactual_api_cost_usd, vibeflow_cost_usd, attempt_idx.
