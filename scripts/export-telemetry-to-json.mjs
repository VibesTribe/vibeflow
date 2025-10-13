#!/usr/bin/env node

/**
 * Export task telemetry events from Supabase into docs/state for GitHub Pages.
 * The CI job that calls this script may run before the backing table exists,
 * so we treat "table missing" errors as an empty dataset instead of failing.
 */
import fs from "fs/promises";
import path from "path";
import process from "process";

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.TELEMETRY_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_ANON_KEY;
const TABLE = process.env.TELEMETRY_TABLE ?? "task_event_rollup";

const OUTPUT_DIR = path.resolve("docs", "state", "telemetry");
const OUTPUT_FILE = path.join(OUTPUT_DIR, `${TABLE}.json`);

function log(message) {
  console.log(`[telemetry:export] ${message}`);
}

async function writeOutput(payload) {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const body = JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      source: SUPABASE_URL ?? null,
      table: TABLE,
      count: Array.isArray(payload) ? payload.length : 0,
      rows: Array.isArray(payload) ? payload : []
    },
    null,
    2
  );
  await fs.writeFile(OUTPUT_FILE, body + "\n", "utf8");
  log(`Wrote ${OUTPUT_FILE}`);
}

async function fetchTelemetry() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log("SUPABASE_URL or SUPABASE_KEY missing; writing empty dataset.");
    await writeOutput([]);
    return;
  }

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${TABLE}?select=*`;
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    let errorBody = null;
    try {
      errorBody = await response.json();
    } catch (err) {
      // ignore
    }

    const errorCode = errorBody?.code ?? errorBody?.error;
    if (errorCode === "PGRST205" || response.status === 404) {
      log(`Table '${TABLE}' not found in Supabase (code ${errorCode ?? response.status}). Writing empty dataset.`);
      await writeOutput([]);
      return;
    }

    const message = errorBody?.message ?? response.statusText;
    throw new Error(`Supabase request failed (${response.status}): ${message}`);
  }

  const data = await response.json();
  await writeOutput(Array.isArray(data) ? data : []);
}

fetchTelemetry().catch(async (error) => {
  console.error("[telemetry:export] failed:", error.message ?? error);
  await writeOutput([]);
  process.exitCode = 1;
});

