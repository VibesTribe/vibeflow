# Orchestrator Scoring — TS-ish Pseudocode (compact)

```ts
type Candidate = { agent_id:string; platform:string; model:string; vec:number[]; policy:string[]; max_ctx:number; rps:number; price:number; scorecard:{success30:number, latP50:number}; };
type TaskProfile = { embedding:number[]; required:{flags:string[], max_ctx:number}; budgetUsd:number };

function eligible(c:Candidate, t:TaskProfile){
  if(c.max_ctx < t.required.max_ctx) return false;
  for (const f of t.required.flags) if(!c.policy.includes(f)) return false;
  return true;
}

function score(c:Candidate, t:TaskProfile){
  const sim = cosine(c.vec, t.embedding);            // [0..1]
  const qual = c.scorecard.success30;                // [0..1]
  const cost = 1/(1+c.price);                        // cheaper → higher
  const lat  = 1/(1+c.scorecard.latP50/1000);        // lower latency → higher
  return 0.5*sim + 0.25*qual + 0.15*cost + 0.10*lat;
}

function route(task:TaskProfile, pool:Candidate[]){
  const P = pool.filter(c => eligible(c, task));
  if(!P.length) throw new Error("NO_ELIGIBLE_CANDIDATES");
  P.sort((a,b)=>score(b,task)-score(a,task));
  return { primary:P[0], fallbacks:P.slice(1,3) };
}
```
