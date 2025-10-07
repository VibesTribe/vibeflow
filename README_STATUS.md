# Vibeflow Model Status Auto-Updater

## Purpose
Keeps `data/status/models/*.json` files up to date with real-time model health.

## How It Works
- Trigger: new event JSON with `severity = warn|error` under `data/events/`
- Script: `scripts/update-model-status.mjs` updates model status files
- Workflow: `model-status-update.yml` commits changes automatically

## Example Output
```json
{
  "platform": "deepseek-api",
  "status": "cooldown",
  "severity": "error",
  "last_message": "quota exceeded; retry at 2025-10-08T01:45:00Z",
  "color": "#e74c3c",
  "last_updated": "2025-10-07T23:45:00Z",
  "cooldown_until": "2025-10-08T01:45:00Z",
  "history": [
    { "status": "near_limit", "severity": "warn", "message": "11/12 rpm", "at": "..." },
    { "status": "cooldown", "severity": "error", "message": "quota exceeded", "at": "..." }
  ]
}
```

## Dashboard Integration
Load these JSONs to render model status chips and tooltips:
- 🟢 healthy → normal
- 🟡 near_limit → approaching quota
- 🔴 cooldown → quota reached / cooldown period

Each record includes a `history[]` for timeline or trend visualization.
