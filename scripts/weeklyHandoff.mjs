// scripts/weeklyHandoff.mjs
// Vibeflow: Unified weekly + latest handoff generator (future-proof edition)
// Safe: local FS only, no API calls or network activity.
// Features: ROI/tasks summary, 72h diff, full repo tree, auto-prune,
// future stubs for telemetry, alerts, ROI trend, registered skills.

import fs from "node:fs";
import path from "node:path";

// --- Environment toggles (future-ready) ---
const ENABLE_ALERTS = process.env.ENABLE_ALERTS === "true";       // pulls from data/events
const ENABLE_TELEMETRY = process.env.ENABLE_TELEMETRY === "true"; // pulls from Supabase metrics
const ENABLE_TREND = process.env.ENABLE_TREND === "true";         // charts ROI trend
const ENABLE_SKILLS = process.env.ENABLE_SKILLS === "true";       // lists registered skills

// ---------- helpers ----------
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

// ---------- main ----------
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

// --- 72-hour change summary ---
const now = Date.now();
const cutoff = now - 72 * 60 * 60 * 1000;
const fileStats = files.map(f => {
  const stat = fs.statSync(f);
  return { path: f, size: stat.size, mtime: stat.mtimeMs };
});
const recent = fileStats.filter(f => f.mtime > cutoff);
recent.sort((a,b)=>b.size-a.size);
const top10 = recent.slice(0,10);

const recentSummary = recent.length
  ? `**Files modified in last 72h:** ${recent.length}\n\n${top10.map(f => `- ${f.path} (size ${f.size.toLocaleString()})`).join("\n")}`
  : "No file modifications detected in last 72 hours.";

// --- diff vs previous week ---
const diff = summarizeDiff(prevFiles, files);

// --- Future stubs ---
let telemetryBlock = "## 🧠 Telemetry Summary\n_(auto-generated if ENABLE_TELEMETRY=true)_";
if (ENABLE_TELEMETRY) telemetryBlock = "## 🧠 Telemetry Summary\n_(Telemetry integration placeholder — data unavailable offline.)_";

let alertsBlock = "## ⚠️ Alerts (Last Week)\n_(none detected)_";
if (ENABLE_ALERTS) alertsBlock = "## ⚠️ Alerts (Last Week)\n_(Alert summary placeholder — ENABLE_ALERTS=true.)_";

let trendBlock = "## 📈 ROI Trend (7 days)\n_(chart placeholder)_";
if (ENABLE_TREND) trendBlock = "## 📈 ROI Trend (7 days)\n_(Trend chart placeholder — ENABLE_TREND=true.)_";

let skillsBlock = "## 🧩 Registered Skills\n_(none yet)_";
if (ENABLE_SKILLS) skillsBlock = "## 🧩 Registered Skills\n_(Skill registry placeholder — ENABLE_SKILLS=true.)_";

// --- build header ---
const dateStr = today.toISOString().replace("T", " ").slice(0, 16);
const header = `# 🪶 Vibeflow Handoff (Enriched) — ${dateStr}
## Totals
- Tasks: ${totals.tasks}  Done: ${totals.done}  Running: ${totals.running}  Queued: ${totals.queued}
- ROI: ${totals.roi}% (CF $${totals.cf_usd} vs VF $${totals.vf_usd})

## 📊 Changes in Last 72 Hours
${recentSummary}

## 📦 Structural Changes
${diff}

${telemetryBlock}

${alertsBlock}

${trendBlock}

${skillsBlock}

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
