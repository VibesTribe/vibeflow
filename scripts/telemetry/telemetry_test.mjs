// scripts/telemetry/telemetry_test.mjs
// Connectivity test for Supabase or local fallback.

import { writeTelemetry } from "./telemetry_writer.mjs";

await writeTelemetry({
  task_id: "T0.test",
  status: "done",
  confidence: 0.999,
  summary: "Connectivity test — OK",
  cost: 0.0,
  latency: 5,
});

console.log("✅ Telemetry test complete. Check Supabase or data/state/task.state.json");
