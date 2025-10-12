# Ideas Workspace

Each idea lives under `data/ideas/<idea_id>/` with the following artifacts:

- `research.brief.json` — authored by Research agent (schema: docs/schemas/research.brief.schema.json)
- `analyst.review.json` — Analyst verdict referencing the brief hash (schema: docs/schemas/analyst.review.schema.json)
- `prd.summary.json` — Generated PRD metadata once user approves (schema: docs/schemas/prd.summary.schema.json)
- `status.json` — Stage machine tracking approvals (schema: docs/schemas/idea.status.schema.json)

Automation should gate the pipeline by checking `status.stage` before moving to the next phase.
