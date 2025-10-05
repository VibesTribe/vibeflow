# Capability Vector — Embedding Recipe (v1)

## Source
- Model/agent spec document: strengths, weaknesses, tools, modalities, policies, resource limits.

## Steps
1) Normalize spec → canonical JSON (ordered keys)
2) Serialize; remove volatile fields; lowercase
3) Embed with chosen embedding model (e.g., 1024 dims)
4) Store vector + `policy_flags` + `resource` ({max_ctx, rps, memory_mb}) in `capability_vector` table
5) Update on: scorecard shift > threshold, provider doc change, weekly refresh

## QA
- Cosine similarity sanity checks against task embeddings
- Drift alarms: large movement triggers supervised review
