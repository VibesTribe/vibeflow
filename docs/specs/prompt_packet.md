# Prompt Packet — Contract

## Purpose
Package **just enough** context + **exact output rules** so Task Agents can paste into any external LLM UI and return deterministic artifacts.

## Fields
- `context` (compact bullet summary with links to PRD/plan excerpts)
- `prompt` (the instruction itself)
- `output_rules` (bulleted constraints like path, file list, schema; no prose)
- `acceptance_criteria` (must pass conditions)
- `est_tokens_prompt` (for ROI/price estimates)
