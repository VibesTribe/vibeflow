# Trusted Tool Dispatcher

Usage examples:

```bash
npm run tools:run -- --tool OpenSpecWriter@v1 --args examples/openspec.example.json
npm run tools:run -- --payload examples/visual-checklist.example.json
```

Payload shape:

```json
{
  "tool": "OpenSpecWriter@v1",
  "args": {
    "slug": "example-openspec-test",
    "title": "Example: confirm Trusted Tool write",
    "rationale": "Smoke test",
    "acceptance_criteria": ["File created", "Digest updated"],
    "notes": ["Run npm run context:openspec afterwards"]
  }
}
```

Visual checklist payload swaps `tool` for `VisualChecklist@v1` and accepts `task_id`, `summary`, `steps`, and `status` arrays.
