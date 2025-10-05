# Architecture Overview (MVP)

**Core services**: Orchestrator, Planning, Supervisor, Task Agents, Visual Agent, Test Agents, Watcher, Analyst, MCP Gateway, Registry, Dashboard.
**Data**: Postgres + pgvector; RunMetrics; Scorecards; CapabilityVectors; Audit Log; Snapshots.
**Contracts**: TaskContract, Plan, RunMetric, Scorecard, CapabilityVector.
**Policies**: Routing, Review, Budget, Failure/Retry, Confidence Gate.
