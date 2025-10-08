# Vibeflow — Agent Logic & Flow (Canonical, ROI- & Reassignment‑Aware)

> Vibeflow is the **conductor**, not the musician. It plans, routes, validates, and ships work across *external* tools/LLMs via modular agents. **Orchestrator assigns; Task Agents execute.** All visual/UI work requires **human approval even after tests pass**.

## Roles & Responsibilities

- **Researcher (Market)** → `research.report.json`
- **User Selection Loop** → `user.selection.json`
- **Researcher (PRD Synthesizer)** → `prd/{project}.json`
- **Planner** → contract‑first vertical slice DAG (≥0.95 confidence) with prompt packets → `data/tasks/slices/*.json`
- **Supervisor (Plan Stage)** → validates atomicity/deps/confidence
- **Orchestrator** → **routes only** (never executes). Maintains assignment & reassignment history, applies policy (eligibility, budget, ROI, continuity), and emits provenance.
- **Task Agents** → execute on target platforms (ChatGPT, Claude Code, Cursor, Codex, Gemini, DeepSeek, etc.) and return artifacts + chat URL/thread ID → `task_output/{task_id}.json`
- **Supervisor (Execution Stage)** → validates output vs schema + DoD, requests rework or approves
- **Tester Agents** → Code (compile/unit/integration) & Visual (Browser‑Use / DevTools MCP). Visual tasks → **Human Review required** even if tests pass.
- **Human Reviewer** → merge gate for visual or risky changes
- **Analyst** → ingests RunMetrics; updates Capability Vectors & Model Scorecards; powers A/B & shadow routing; updates pricing table
- **System Researcher** → tracks new models/platforms/costs; publishes digests
- **Maintenance** → applies safe updates (deps, models, adapters) based on research
- **Watcher (MCP Runtime)** → detects drift/loops/quota issues during IDE/CLI runs; switches models; preserves task state

## Data Flow (Condensed)
User Idea → Research (Market → PRD) → Planner → Supervisor(plan) → Orchestrator → Task Agent(s) →
Supervisor(exec) → Tester(code/visual) → **Human Approval (visual always)** → Merge →
Analyst (RunMetrics → Vectors/Scorecards/Prices) → System Researcher → Maintenance → Watcher (MCP)

## Dashboard Principles
- Single source of truth: `data/state/task.state.json`
- Dual views: **Cards** and **Graph** (DAG). Sidebar: uploads, file explorer, GitHub links
- Live **ROI** & **Model Overview**: per task/slice/project (success/failure/latency/cost/tokens)
- Provenance everywhere: platform/model, chat URL, retries, reasons, status, *reassignment count*

## Vendor Agnosticism
Adapters for Agent‑Zero, LiteLLM, Browser‑Use, Chrome DevTools MCP, mem0, Supabase/pgvector, etc. All modules are swappable via **contracts + schemas** (no lock‑in).

## Reassignment Policy (Summary)
- Reassignment is **first‑class telemetry**: whenever Supervisor rejects or a platform fails (rate limit, partial output, policy block, hallucination), Orchestrator records a **task assignment event** with reason code and cost deltas.
- Routing prefers **continuity** with the same successful chat/thread (context reuse), balanced against expected quality/cost/latency via weights.
- Excessive reassignments trigger **cooldown** for that model/platform and contribute to a *negative score modifier* in Capability Vectors.

## Routing Optimization (High Level)
```
Score =
  w1 * cosine(Q_task, C_agent)
- w2 * resource_gap
- w3 * expected_cost
+ w4 * historical_success
+ w5 * expected_roi_gain
+ w6 * continuity_bonus
- w7 * reassignment_penalty
```
Where:
- `expected_roi_gain` = (counterfactual_api_cost_usd − vibeflow_incremental_cost_usd) / max(0.01, vibeflow_incremental_cost_usd)
- `continuity_bonus` rewards sticking with a proven chat/thread where context saves tokens and improves quality
- `reassignment_penalty` increases with prior failures this task on that platform/model in the last N attempts

## Build Order (Priority)
0–2. **Foundation**: CI, Capability Vectors, Scorecards, Routing (+Budget/ROI hooks)  
3. **Planning**: Planner + Supervisor(plan) + validators  
4. **Execution**: Orchestrator + Task Agents + assignment history  
5. **Validation**: Supervisor(exec) + Tester Agents (code/visual)  
6. **Dashboard**: state machine, cards/graph, ROI & Model Overview  
7. **Self‑Improvement**: Analyst, System Researcher, Maintenance  
8. **Watcher + MCP**: IDE/CLI runtime guard
