# Task Packets

Planner outputs are grouped by idea id and slice.

```
data/taskpackets/<idea_id>/<slice_id>/plan.json
                                     /<task_id>.json
```

Every `plan.json` matches `docs/contracts/plan.schema.json`, and each task packet matches
`docs/contracts/task_contract.schema.json`. These files are the source of truth for the
supervisor gate, orchestrator dispatch, and dashboard telemetry.
