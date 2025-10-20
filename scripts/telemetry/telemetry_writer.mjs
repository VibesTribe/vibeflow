// scripts/telemetry/telemetry_writer.mjs
// Writes per-task telemetry to Supabase or local fallback (data/state/task.state.json)

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const LOCAL_STATE = path.join(ROOT, "data/state/task.state.json");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
const supabase = url && key ? createClient(url, key) : null;

/**
 * Writes telemetry entry to Supabase or local JSON fallback.
 * @param {object} entry  {task_id, status, confidence, summary, cost, latency}
 */
export async function writeTelemetry(entry) {
  const record = {
    task_id: entry.task_id,
    status: entry.status,
    confidence: entry.confidence ?? null,
    summary: entry.summary ?? "",
    cost_usd: entry.cost ?? 0,
    latency_ms: entry.latency ?? 0,
    created_at: new Date().toISOString(),
  };

  try {
    if (supabase) {
      const { error } = await supabase.from("run_metrics").insert(record);
      if (error) throw error;
      console.log("✅ Telemetry written to Supabase:", record.task_id);
    } else {
      await appendLocal(record);
    }
  } catch (err) {
    console.warn("⚠️ Telemetry fallback (local):", err.message);
    await appendLocal(record);
  }
}

async function appendLocal(record) {
  try {
    const prev = JSON.parse(await fs.readFile(LOCAL_STATE, "utf8"));
    prev.push(record);
    await fs.writeFile(LOCAL_STATE, JSON.stringify(prev, null, 2));
  } catch {
    await fs.writeFile(LOCAL_STATE, JSON.stringify([record], null, 2));
  }
}
