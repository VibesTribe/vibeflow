# Vibeflow Phase 3 — Live Dashboard Integration

## Files Included
- src/dashboard/ModelAnalyticsView.tsx — main React dashboard page
- src/adapters/roi.ts — ROI formatter
- src/components/dashboard/TelemetryCard.tsx — card component for each metric

## Setup
1. Ensure your Codespace or environment has:
   - SUPABASE_URL
   - SUPABASE_KEY

2. Build or start the React dashboard as usual.

3. The dashboard will connect to Supabase and display telemetry rows from the `run_metrics` table.

4. Tailwind styling matches your existing Cardview (dark/light theme supported).

## Expected Output
Each row from `run_metrics` appears as a card showing:
- Task ID
- Summary
- Confidence, Latency, Cost, ROI
- Created timestamp

This completes Phase 3 — connecting your Supabase telemetry to a live dashboard.
