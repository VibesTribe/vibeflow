// scripts/weeklyHandoff.mjs
// Builds rolling weekly handoff + latest digest with ROI/Tasks + full file tree + pruning

import fs from "node:fs";
import path from "node:path";

// === helpers ===
function walk(dir, arr = []) {
  for (const f of fs.readdirSync(dir)) {
    if ([".git", "node_modules"].includes(f)) continue;
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, arr);
    else arr.push(path.relative(process.cwd(), p));
  }
  return arr.sort();
}

function getWeekRange(date = new Date()) {
  const start = new Date(date);
  start.setDate(date.getDate() - start.getDay()); // Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
}

function summarizeDiff(prevList, currList) {
  const added = currList.filter((x) => !prevList.includes(x));
  const removed = prevList.filter((x) => !currList.includes(x));
  const lines = [];
  if (added.length) lines.push(`### 🟢 Added (${added.length})\n${added.map(x => `- ${x}`).join("\n")}`);
  if (removed.length) lines.push(`### 🔴 Removed (${removed.length})\n${removed.map(x => `- ${x}`).join("\n")}`);
  return lines.length ? lines.join("\n\n") : "✅ No file structure changes.";
}

function readJSONSafe(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

// === main ===
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "updates");
fs.mkdirSync(OUT_DIR, { recursive: true });

const today = new Date();
const { start, end } = getWeekRange(today);
const weekFile = path.join(OUT_DIR, `handoff_week_${start}_to_${end}.md`);
const latestFile = path.join(OUT_DIR, "latest.md");

// --- read repo state ---
const files = walk(".");
const prevWeekFile = fs.readdirSync(OUT_DIR).filter(f => f.startsWith("handoff_week_")).sort().slice(-1)[0];
let prevFiles = [];
if (prevWeekFile && fs.existsSync(path.join(OUT_DIR, prevWeekFile))) {
  const match = fs.readFileSync(path.join(OUT_DIR, prevWeekFile), "utf8").match(/```([\s\S]*?)```/);
  if (match) prevFiles = match[1].trim().split("\n");
}

// --- load metrics if available ---
const metricsFile = path.join(ROOT, "data", "metrics", "run_metrics.json");
const metrics = readJSONSafe(metricsFile) || {};
const totals = {
  tasks: metrics.tasks_total ?? 0,
  done: metrics.done ?? 0,
  running: metrics.running ?? 0,
  queued: metrics.queued ?? 0,
  cf_usd: metrics.cf_usd ?? 0,
  vf_usd: metrics.vf_usd ?? 0,
  roi: metrics.roi_percent ?? 0
};

// --- build sections ---
const diff = summarizeDiff(prevFiles, files);
const dateStr = today.toISOString().replace("T", " ").slice(0, 16);
const header = `# 🪶 Vibeflow Handoff (Enriched) — ${dateStr}
## Totals
- Tasks: ${totals.tasks}  Done: ${totals.done}  Running: ${totals.running}  Queued: ${totals.queued}
- ROI: ${totals.roi}% (CF $${totals.cf_usd} vs VF $${totals.vf_usd})

## 📦 Recent Changes
${diff}

---

<details><summary>Full Current Repo File Tree (${files.length} files)</summary>

\`\`\`
${files.join("\n")}
\`\`\`

</details>
`;

// --- write files ---
let weekContent = "";
try { weekContent = fs.readFileSync(weekFile, "utf8"); } catch {}
fs.writeFileSync(weekFile, `${header}\n\n${weekContent}`);
fs.writeFileSync(latestFile, header);

console.log(`✅ Weekly file updated: ${weekFile}`);
console.log(`✅ Latest digest written: ${latestFile}`);

// --- prune old weeklies (>4 weeks) ---
const keepMs = 28 * 24 * 60 * 60 * 1000;
for (const f of fs.readdirSync(OUT_DIR)) {
  if (!f.startsWith("handoff_week_")) continue;
  const fp = path.join(OUT_DIR, f);
  const stat = fs.statSync(fp);
  if (Date.now() - stat.mtimeMs > keepMs) {
    fs.unlinkSync(fp);
    console.log(`🗑️  Pruned old weekly ${f}`);
  }
}
