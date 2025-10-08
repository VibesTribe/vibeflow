// src/state/deriveTaskStats.ts
// Mock-safe aggregator that merges assignment history + cost ledgers into per-task stats.
// You can call this in your loader or Redux/ Zustand store initializer.

import fs from "node:fs/promises";
import path from "node:path";

type TaskState = {
  task_id: string;
  title?: string;
  status?: "queued"|"running"|"done"|"failed";
  task_type?: string;
  domain_tag?: string;
  // Optionally store derived stats in the same object:
  attempts?: number;
  roi?: { cf_usd: number; vf_usd: number; roi_pct: number };
};

type Ledger = {
  scope: "task"|"slice"|"project";
  scope_id: string;
  totals: {
    vibeflow_cost_usd: number;
    counterfactual_api_cost_usd: number;
    savings_usd: number;
    roi_percent: number;
  };
};

type History = {
  task_id: string;
  events: Array<{ action: string }>;
};

const ROOT = process.cwd();
const LEDGER_DIR = path.join(ROOT, "data", "ledger");
const ASSIGN_DIR = path.join(ROOT, "data", "telemetry", "assignments");

async function maybeReadJSON<T>(p: string): Promise<T | null> {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

export async function deriveTaskStats(tasks: TaskState[]) {
  const byId = new Map<string, TaskState>();
  for (const t of tasks) byId.set(t.task_id, { ...t });

  // Merge ledgers
  try {
    const files = await fs.readdir(LEDGER_DIR);
    for (const f of files) {
      if (!f.startsWith("task_") || !f.endsWith(".json")) continue;
      const led = await maybeReadJSON<Ledger>(path.join(LEDGER_DIR, f));
      if (!led || led.scope !== "task") continue;
      const id = led.scope_id;
      const cur = byId.get(id) || { task_id: id };
      cur.roi = {
        cf_usd: led.totals.counterfactual_api_cost_usd || 0,
        vf_usd: led.totals.vibeflow_cost_usd || 0,
        roi_pct: led.totals.roi_percent || 0
      };
      byId.set(id, cur);
    }
  } catch {}

  // Merge attempts from assignment histories
  try {
    const files = await fs.readdir(ASSIGN_DIR);
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const hist = await maybeReadJSON<History>(path.join(ASSIGN_DIR, f));
      if (!hist) continue;
      const id = hist.task_id;
      const cur = byId.get(id) || { task_id: id };
      cur.attempts = (hist.events || []).filter(e => ["assigned","reassigned","retry"].includes(String(e.action))).length;
      byId.set(id, cur);
    }
  } catch {}

  return Array.from(byId.values());
}
