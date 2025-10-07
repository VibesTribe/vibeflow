# Vibeflow — Brevo Alerts (Paid Providers Only)

**Triggers**
- Events under `data/events/*.json` with `platform` mapped to a **paid** provider in `config/alerts.providers.json`
- Event type/severity indicating **credit/quota/auth** issues (e.g. `platform.limit`, `api.credit_exhausted`, `api.auth_error`, or `model.status` with `severity=error`).

**Configure providers**
Edit: `config/alerts.providers.json` (toggle `"paid": true/false`, adjust `aliases`).

**Secrets**
- `BREVO_API_KEY`
- `BREVO_FROM_EMAIL`
- `BREVO_FROM_NAME`
- `BREVO_TO` (comma-separated allowed)
