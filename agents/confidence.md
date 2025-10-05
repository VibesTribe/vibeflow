# Confidence Policy

Planner emits `confidence` with evidence components; Supervisor recomputes from ground truth.
Hard gate ≥0.95; reject when |planner−supervisor| > 0.05.
Components: spec_coverage, acceptance_alignment, similar_task_prior, routing_fit, budget_feasibility.
