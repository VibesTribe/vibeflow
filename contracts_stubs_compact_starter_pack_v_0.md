# Vibeflow Contracts & Stubs — Compact Starter Pack (v0)

This is a **compact** bundle to avoid canvas length limits. It lists the core contracts and provides **minimal, valid JSON Schemas** plus **tiny TS interfaces**. We can extend each schema in small follow‑ups.

---

## Index (intended file layout)
```
contracts/
  plan.schema.json
  task_contract.schema.json
  run_metric.schema.json
  model_scorecard.schema.json
  registry_model.schema.json
packages/core/
  src/memory/MemoryRepository.ts
  src/registry/RegistryService.ts
```

---

## contracts/plan.schema.json (minimal)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/plan-v1.json",
  "type": "object",
  "required": ["context_snapshot_id", "slices", "echo_check"],
  "properties": {
    "context_snapshot_id": {"type": "string"},
    "slices": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["slice_id", "name", "goal", "tasks"],
        "properties": {
          "slice_id": {"type": "string"},
          "name": {"type": "string"},
          "goal": {"type": "string"},
          "budget_usd": {"type": "number", "minimum": 0},
          "tasks": {"type": "array", "items": {"type": "object"}}
        }
      }
    },
    "open_questions": {"type": "array", "items": {"type": "object"}},
    "echo_check": {"type": "string"}
  }
}
```

## contracts/task_contract.schema.json (minimal)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/task-contract-v1.json",
  "type": "object",
  "required": ["task_id", "title", "context_snapshot_id", "task_type", "domain_tag", "constraints", "output_schema"],
  "properties": {
    "task_id": {"type": "string"},
    "title": {"type": "string"},
    "context_snapshot_id": {"type": "string"},
    "parent_task_id": {"type": ["string", "null"]},
    "task_type": {"type": "string"},
    "domain_tag": {"type": "string"},
    "stage": {"type": "string"},
    "review_policy": {"type": "string", "enum": ["auto", "visual_agent", "human", "merge_gate"]},
    "constraints": {
      "type": "object",
      "required": ["budget_usd", "max_tokens", "latency_slo_ms"],
      "properties": {
        "budget_usd": {"type": "number", "minimum": 0},
        "max_tokens": {"type": "integer", "minimum": 0},
        "latency_slo_ms": {"type": "integer", "minimum": 0},
        "model_behavior_required": {"type": "object"}
      }
    },
    "inputs": {"type": "object"},
    "acceptance_criteria": {"type": "array", "items": {"type": "string"}},
    "output_schema": {"type": "object"},
    "model_preferences": {"type": "object"},
    "validation_checkpoints": {"type": "array", "items": {"type": "object"}},
    "requires_tests": {"type": "boolean"}
  }
}
```

## contracts/run_metric.schema.json (minimal)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/run-metric-v1.json",
  "type": "object",
  "required": ["task_id", "platform", "model", "cost_usd", "latency_ms", "success"],
  "properties": {
    "task_id": {"type": "string"},
    "platform": {"type": "string"},
    "model": {"type": "string"},
    "tokens_prompt": {"type": "integer", "minimum": 0},
    "tokens_output": {"type": "integer", "minimum": 0},
    "cost_usd": {"type": "number", "minimum": 0},
    "latency_ms": {"type": "integer", "minimum": 0},
    "success": {"type": "boolean"},
    "retries": {"type": "integer", "minimum": 0},
    "validation_passed": {"type": "boolean"}
  }
}
```

## contracts/model_scorecard.schema.json (minimal)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/model-scorecard-v1.json",
  "type": "object",
  "required": ["platform", "model", "task_type", "success_rate_30d"],
  "properties": {
    "platform": {"type": "string"},
    "model": {"type": "string"},
    "task_type": {"type": "string"},
    "success_rate_30d": {"type": "number", "minimum": 0, "maximum": 1},
    "p50_latency_ms": {"type": "integer", "minimum": 0},
    "p95_latency_ms": {"type": "integer", "minimum": 0},
    "cost_per_1k_tokens": {"type": "number", "minimum": 0},
    "rate_limit_rps": {"type": "number", "minimum": 0},
    "max_context_tokens": {"type": "integer", "minimum": 0},
    "policy_flags": {"type": "array", "items": {"type": "string"}}
  }
}
```

## contracts/registry_model.schema.json (minimal)
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://vibeflow.dev/schemas/registry-model-v1.json",
  "type": "object",
  "required": ["platform", "model", "max_context_tokens", "rate_limit_rps", "cost_per_1k_tokens"],
  "properties": {
    "platform": {"type": "string"},
    "model": {"type": "string"},
    "max_context_tokens": {"type": "integer", "minimum": 0},
    "rate_limit_rps": {"type": "number", "minimum": 0},
    "cost_per_1k_tokens": {"type": "number", "minimum": 0},
    "supports_tools": {"type": "boolean"},
    "supports_vision": {"type": "boolean"},
    "supports_audio": {"type": "boolean"},
    "deprecation_after": {"type": ["string", "null"]},
    "refresh_period_sec": {"type": "integer", "minimum": 0},
    "tags": {"type": "array", "items": {"type": "string"}},
    "source_url": {"type": "string"},
    "fetched_at": {"type": "string", "format": "date-time"}
  }
}
```

---

## packages/core/src/memory/MemoryRepository.ts (tiny)
```ts
export interface ArtifactRef { id: string; path?: string; meta?: Record<string, unknown>; }
export interface Handoff { brief: string; artifact_refs: ArtifactRef[]; snapshot_id: string; }
export interface EmbeddingQuery { vector: number[]; filter?: Record<string, unknown>; }

export interface MemoryRepository {
  putHandoff(taskId: string, data: Handoff): Promise<void>;
  getHandoff(taskId: string): Promise<Handoff | null>;
  searchArtifacts(q: EmbeddingQuery, k: number): Promise<ArtifactRef[]>;
}
```

## packages/core/src/registry/RegistryService.ts (tiny)
```ts
export interface RegistryModel {
  platform: string; model: string;
  max_context_tokens: number; rate_limit_rps: number; cost_per_1k_tokens: number;
  supports_tools?: boolean; supports_vision?: boolean; supports_audio?: boolean;
  deprecation_after?: string | null; refresh_period_sec?: number; tags?: string[];
  source_url?: string; fetched_at?: string;
}

export interface RegistryService {
  listModels(platform?: string): Promise<RegistryModel[]>;
  reload(scope: 'light' | 'deep'): Promise<{ ok: boolean; diffId: string }>;
  getDiff(sinceIso?: string): Promise<{ changes: number; items: RegistryModel[] }>;
}
```

---

### Notes
- These are **minimal**. They validate structure without locking you into details.
- We can extend each schema in small increments (additive) to stay below doc limits.

