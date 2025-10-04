# Vibeflow Routing Policy — Compact v1

This policy defines how the Orchestrator selects a platform/model/agent for a TaskContract. It is **data‑driven** and **agnostic**. All inputs come from the Registry, Capability Vectors, Model Scorecards, and TaskContract.

## 1) Eligibility Filters (hard)
A candidate agent is **eligible** iff all are true:
- Meets required `policy_flags` (e.g., `PII_FREE`, `DETERMINISTIC_OK`).
- `max_context_tokens ≥ task.estimated_ctx` (or contract `max_token_context`).
- Circuit breaker is **closed** and current rate < `rate_limit_rps`.
- Expected cost ≤ `constraints.budget_usd` (given tokens + provider pricing).

## 2) Optimization Score (soft)
For each eligible agent A with Capability Vector `C_A`, compute:
```
Score(A) = w1 * sim(Q_task, C_A) - w2 * resource_gap(A) - w3 * expected_cost(A)
           + w4 * success_prior(A, task_type) - w5 * latency_penalty(A)
```
**Defaults:** `w1=0.40, w2=0.15, w3=0.15, w4=0.20, w5=0.10`  
- `sim` = cosine similarity between task query embedding and agent capability embedding.  
- `resource_gap` = normalized deficit vs required context, memory, or rate ceiling.  
- `expected_cost` = tokens_prompt * price_in + tokens_output * price_out.  
- `success_prior` = ModelScorecard success for `task_type` (0..1).  
- `latency_penalty` = normalized p95 latency.

Pick **argmax Score(A)**, then choose **next N-1** for fallbacks.

## 3) Fallbacks & Retries
- On `E/RATE_LIMIT` → exponential backoff (100ms → 1.6s) up to 5 attempts, then open circuit.
- On `E/REASONING_FLAW` or `E/HALLUCINATION_DETECTED` → one enriched‑prompt retry on same model; else reroute to next candidate.
- For visual/UX tasks, prefer models with `supports_vision=true`.

## 4) Shadow Routing (optional)
- With `shadow=true`, run best candidate and **shadow** candidate; compare RunMetrics.
- Analyst records deltas; auto‑tune weights weekly.

## 5) Weekly Tuning Checklist
1. Inspect Scorecard deltas (success, cost, p95).  
2. Penalize models with rising `E/RATE_LIMIT` or `p95 ↑`.  
3. Boost models with consistent `success_prior ≥ 0.9` and lower cost.  
4. Re‑embed Capability Vectors when model specs change.  
5. Update `w*` weights gradually (≤ 0.05 change/week); document in Audit Trail.

## 6) Audit Log (must record)
- Input TaskContract id/hash.  
- Eligible set and filter reasons for rejects.  
- Scores for top‑5 candidates + chosen one.  
- Fallbacks/Retry sequence and outcomes.  
- Final RunMetric + provenance `{platform, model}`.

