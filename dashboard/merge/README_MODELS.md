# Dashboard Models Reference

This document describes how to register new dashboard views.

Each stable dashboard (Cardview, ModelView, ROIView, etc.) includes:
- index.html
- assets/css/styles.css
- assets/js/app.js
- manifest.json

The merge builder auto-detects any subfolder under `dashboard/stable/`
that contains a manifest.json.

No manual edits are required—just create your folder and manifest.

Future views (like VibesView) will be recognized automatically.
