# ROI & Cost Intelligence — Specification (Reassignment‑Aware)

## Purpose
Quantify savings from using consumer web platforms vs paid APIs, including **Vibeflow’s own costs**, and fully **account for reassignments** (retries, platform switches). Aggregate **per task → per slice → per project**.

## Key Concepts
- **External Platform (No API Cost)**: consumer web UIs used by Task Agents (often $0)
- **Counterfactual API Cost**: what the same work *would have cost* via paid API pricing for the model
- **Vibeflow Cost**: costs incurred by Vibeflow (planning, validation, vectors, RAG, etc.)
- **Assignment Event**: `assigned | reassigned | retry | completed | failed` with reasons & deltas
- **Continuity**: reusing the *same chat/thread* to save context tokens and preserve quality

## Per‑Task Accounting
For each attempt (assignment event):
- Estimate tokens: `est_tokens_prompt`, `est_tokens_output`
- Compute **counterfactual_api_cost_usd** = (est_prompt*price_in + est_output*price_out)/1000
- Record **vibeflow_cost_usd** from `RunMetric.cost_usd` (actual VF API spend for planning/validation/etc.)
- Mark **reason_code**: `E/RATE_LIMIT`, `E/TOO_LONG`, `E/POLICY_BLOCK`, `E/HALLUCINATION`, `E/CUTOFF`, `E/QUALITY_BELOW_DOD`, etc.
- If reassigned, link the attempt to prior attempts with `attempt_idx` and `from_platform/model`

**Task Totals**
```
task.vf_cost = Σ attempt.vibeflow_cost_usd
task.cf_api_cost = Σ attempt.counterfactual_api_cost_usd
task.savings = task.cf_api_cost - task.vf_cost
task.roi_percent = (task.savings / max(0.01, task.vf_cost)) * 100
task.reassignment_count = number of reassignment events
```
Rollups for **slice/project** are simple sums (and recomputed ROI).

## UI
- **Task chips**: CF$, VF$, ROI%, attempts, reassignment count
- **Slice/Project**: stacked bar (CF vs VF), ROI% headline, *Attempts per Task* chart
- **Model Overview**: success rate, avg cost, p50/p95 latency, **avg attempts per success**, **win‑rate per task type**

## Routing Hooks
- `expected_roi_gain` term in routing score
- `continuity_bonus` when reusing the same chat/thread
- `reassignment_penalty` increases with each failed attempt on a platform/model

## Data Sources
- `RunMetric` (tokens, cost, latency, success, validation_passed)
- `TaskAssignmentHistory` (events with reasons, continuity metadata, chat URLs)
- **Model Price Table** (Analyst‑maintained, nightly refresh)
