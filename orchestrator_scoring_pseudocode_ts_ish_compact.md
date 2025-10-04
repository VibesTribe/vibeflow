# Orchestrator Scoring — Pseudocode (TS‑ish, compact)

```ts
interface Candidate {
  id: string;
  embedding: number[];
  policyFlags: string[];
  maxCtx: number; rps: number;
  priceIn: number; priceOut: number;
  p50: number; p95: number;
  successPrior: Record<string, number>; // by task_type
}

const W = { w1: 0.40, w2: 0.15, w3: 0.15, w4: 0.20, w5: 0.10 };

export function route(task: TaskContract, cands: Candidate[]): RoutingDecision {
  const q = embed(taskProfile(task)); // text → vector
  const eligible = cands.filter(c => isEligible(task, c));
  if (!eligible.length) throw new Error('NoEligibleCandidates');

  const scored = eligible.map(c => {
    const sim = cosineSim(q, c.embedding); // 0..1
    const resourceGap = calcResourceGap(task, c); // 0..1 higher = worse
    const expectedCost = estimateCost(task, c);   // normalized 0..1
    const success = (c.successPrior[task.task_type] ?? 0.5); // fallback
    const latency = normalizeLatency(c.p95);      // 0..1

    const score = W.w1*sim - W.w2*resourceGap - W.w3*expectedCost + W.w4*success - W.w5*latency;
    return { id: c.id, score, breakdown: { sim, resourceGap, expectedCost, success, latency } };
  }).sort((a,b) => b.score - a.score);

  const primary = scored[0];
  const fallbacks = scored.slice(1, 3); // next two as fallback
  return { primary, fallbacks, audited: scored.slice(0,5) };
}

function isEligible(t: TaskContract, c: Candidate): boolean {
  if (!hasFlags(c.policyFlags, t.constraints.model_behavior_required?.policy_flags)) return false;
  if ((c.maxCtx ?? 0) < (t.constraints.model_behavior_required?.max_token_context ?? 0)) return false;
  if (isCircuitOpen(c.id) || isRateHot(c.id, c.rps)) return false;
  if (estimateCost(t, c) > normalizeBudget(t.constraints.budget_usd)) return false;
  return true;
}

function calcResourceGap(t: TaskContract, c: Candidate): number {
  const need = (t.constraints.model_behavior_required?.max_token_context ?? 0);
  const ctxGap = need > 0 ? clamp01((need - (c.maxCtx||0)) / Math.max(need,1)) : 0;
  const rpsGap = isRateHot(c.id, c.rps) ? 1 : 0;
  return clamp01(0.7*ctxGap + 0.3*rpsGap);
}

function estimateCost(t: TaskContract, c: Candidate): number {
  const tokensIn = estimatePromptTokens(t); // heuristic
  const tokensOut = estimateOutputTokens(t);
  const usd = tokensIn*c.priceIn + tokensOut*c.priceOut;
  return normalizeCost(usd);
}
```

