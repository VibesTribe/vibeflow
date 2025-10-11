// Reads Supabase -> writes data/state/task.state.json for the Pages dashboard.
// Env (in Actions): SUPABASE_URL, SUPABASE_SERVICE_KEY

import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

function deriveStatus(events) {
  if (!events.length) return "submitted";
  const last = events[events.length - 1].type;
  if (["MERGED","APPROVED"].includes(last)) return "completed";
  if (["REJECTED"].includes(last)) return "rejected";
  if (["STARTED","PARTIAL","VALIDATED"].includes(last)) return "running";
  if (["ASSIGNED"].includes(last)) return "queued";
  return "submitted";
}

async function main() {
  // Pull all task events (you can scope by recent window later)
  const { data: ev, error: e1 } = await sb
    .from("task_events")
    .select("task_id, type, at")
    .order("at", { ascending: true });
  if (e1) throw e1;

  const grouped = new Map();
  for (const row of ev || []) {
    if (!grouped.has(row.task_id)) grouped.set(row.task_id, []);
    grouped.get(row.task_id).push({ type: row.type, at: row.at });
  }

  // Aggregate cost/run metrics
  const { data: runs, error: e2 } = await sb
    .from("run_metrics")
    .select("task_id, cost_usd, tokens_prompt, tokens_output, success");
  if (e2) throw e2;

  const cost = new Map();
  for (const r of runs || []) {
    const c = cost.get(r.task_id) || { cost_usd: 0, tokens_prompt: 0, tokens_output: 0, run_count: 0, success_count: 0 };
    c.cost_usd += r.cost_usd || 0;
    c.tokens_prompt += r.tokens_prompt || 0;
    c.tokens_output += r.tokens_output || 0;
    c.run_count += 1;
    if (r.success === true) c.success_count += 1;
    cost.set(r.task_id, c);
  }

  const tasks = [];
  const timelines = {};
  const totals = { tasks: 0, completed: 0, running: 0, queued: 0, rejected: 0, submitted: 0 };

  for (const [task_id, events] of grouped.entries()) {
    const status = deriveStatus(events);
    totals.tasks += 1;
    totals[status] = (totals[status] || 0) + 1;
    timelines[task_id] = events;
    const c = cost.get(task_id) || { cost_usd: 0, tokens_prompt: 0, tokens_output: 0, run_count: 0, success_count: 0 };
    tasks.push({
      task_id,
      status,
      cost_usd: +c.cost_usd.toFixed(4),
      tokens_prompt: c.tokens_prompt,
      tokens_output: c.tokens_output,
      runs: c.run_count,
      success_runs: c.success_count
    });
  }

  const state = { generated_at: new Date().toISOString(), stats: { totals }, tasks, timelines };
  const out = path.join(process.cwd(), "data", "state", "task.state.json");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, JSON.stringify(state, null, 2));
  console.log("Wrote", out);
}

main().catch(err => { console.error(err); process.exit(1); });
