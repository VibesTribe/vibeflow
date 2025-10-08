// scripts/generate-enriched-handoff.mjs
// Builds docs/updates/handoff_ENRICHED_YYYY-MM-DD_HH-MM.md using task.state.json and repo snapshot.
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, "data", "state", "task.state.json");
const SNAP_FILE  = path.join(ROOT, "docs", "reports", "repo-snapshot.json");
const OUT_DIR    = path.join(ROOT, "docs", "updates");

function fmt(n){ 
  const x = (typeof n === "number") ? n : Number(n||0);
  return new Intl.NumberFormat("en-US",{ maximumFractionDigits: 2 }).format(isFinite(x)?x:0);
}

async function maybeReadJSON(p, fallback){
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return fallback; }
}

function linesJoin(arr){ return arr.filter(Boolean).join("\n"); }

async function main(){
  const state = await maybeReadJSON(STATE_FILE, { tasks:[], slices:[], stats:{ totals:{}, costs:{} } });
  const snap  = await maybeReadJSON(SNAP_FILE, { files:[] });

  const now = new Date();
  const d = now.toISOString().slice(0,10);
  const t = now.toISOString().slice(11,16).replace(":", "-");
  const outPath = path.join(OUT_DIR, `handoff_ENRICHED_${d}_${t}.md`);
  await fs.mkdir(OUT_DIR, { recursive: true });

  const tasks = Array.isArray(state.tasks) ? state.tasks : [];
  const completed = tasks.filter(t => t.status === "done");
  const running   = tasks.filter(t => t.status === "running");
  const queued    = tasks.filter(t => t.status === "queued");

  const changedList = (snap.files || []).slice(0, 50).map(f => `- ${f.path} (size ${fmt(f.size)})`);

  const md = linesJoin([
    `# Handoff (Enriched) — ${d} ${t}`,
    "",
    "## Totals",
    `- Tasks: ${fmt(state?.stats?.totals?.tasks)}  Done: ${fmt(state?.stats?.totals?.completed)}  Running: ${fmt(state?.stats?.totals?.running)}  Queued: ${fmt(state?.stats?.totals?.queued)}`,
    `- ROI: ${fmt(state?.stats?.costs?.roi_percent)}% (CF $ ${fmt(state?.stats?.costs?.counterfactual_api_cost_usd)} vs VF $ ${fmt(state?.stats?.costs?.vibeflow_cost_usd)}; savings $ ${fmt(state?.stats?.costs?.savings_usd)})`,
    "",
    "## Recently Changed Files",
    ...(changedList.length ? changedList : ["- (no snapshot yet)"]),
    "",
    "## Completed",
    ...(completed.length ? completed.map(t => `- ${t.task_id} ${t.title || ""}`) : ["- None"]),
    "",
    "## In Progress",
    ...(running.length ? running.map(t => `- ${t.task_id} ${t.title || ""}`) : ["- None"]),
    "",
    "## Queued",
    ...(queued.length ? queued.map(t => `- ${t.task_id} ${t.title || ""}`) : ["- None"]),
    ""
  ]);

  await fs.writeFile(outPath, md, "utf8");
  console.log("Wrote", path.relative(ROOT, outPath));
}

main().catch(err => { console.error(err); process.exit(1); });
