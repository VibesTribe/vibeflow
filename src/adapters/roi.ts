// src/adapters/roi.ts
// Mock-safe ROI helpers: write per-task ledgers to data/ledger/*.json when possible.
import fs from "node:fs/promises";
import path from "node:path";
import { CostLedger } from "../types/telemetry";

const ROOT = process.cwd();
const LEDGER_DIR = path.join(ROOT, "data", "ledger");

async function ensureDir(p: string){ try { await fs.mkdir(p, { recursive: true }); } catch {} }

export function calcRoi(vf: number, cf: number) {
  const savings = cf - vf;
  const roi = vf > 0 ? (savings / vf) * 100 : (cf > 0 ? Infinity : 0);
  return { savings_usd: savings, roi_percent: Number.isFinite(roi) ? roi : 0 };
}

export async function writeTaskLedger(taskId: string, vfCost: number, cfCost: number, byPlatform?: CostLedger["by_platform"]) {
  await ensureDir(LEDGER_DIR);
  const { savings_usd, roi_percent } = calcRoi(vfCost, cfCost);
  const ledger: CostLedger = {
    scope: "task",
    scope_id: taskId,
    totals: {
      vibeflow_cost_usd: vfCost || 0,
      counterfactual_api_cost_usd: cfCost || 0,
      savings_usd,
      roi_percent
    },
    by_platform
  };
  const file = path.join(LEDGER_DIR, `task_${taskId}.json`);
  try {
    await fs.writeFile(file, JSON.stringify(ledger, null, 2), "utf8");
  } catch {}
  return ledger;
}
