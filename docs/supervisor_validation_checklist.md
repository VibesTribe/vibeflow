# Supervisor Validation Checklist (v1)

- Context binding: `context_snapshot_id` matches current run
- Schema validity: plan/tasks validate against JSON Schemas
- Confidence gate: all leaf tasks `confidence ≥ 0.95`
- Acceptance criteria: concrete, testable, non-ambiguous
- Output schema: present per task and minimal to prove value
- Dependencies: DAG acyclic; every dependency id exists
- Budget & SLO: per-task constraints set; total <= project budget
- Review policy: visual tasks marked `ui/*` route to visual_agent
- Provenance: record planner version, timestamp
- Echo check: matches goal and constraints
