// scripts/weeklyHandoff.mjs
// Builds a rolling weekly handoff + prunes old weeklies + updates docs/updates/latest.md

import fs from "node:fs";
import path from "node:path";

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

// --- main ---
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "updates");
fs.mkdirSync(OUT_DIR, { recursive: true });

const today = new Date();
const { start, end } = getWeekRange(today);
const weekFile = path.join(OUT_DIR, `handoff_week_${start}_to_${end}.md`);
const latestFile = path.join(OUT_DIR, "latest.md");

const files = walk(".");
const prevWeekFile = fs.readdirSync(OUT_DIR).filter(f => f.startsWith("handoff_week_")).sort().slice(-1)[0];
let prevFiles = [];
if (prevWeekFile && fs.existsSync(path.join(OUT_DIR, prevWeekFile))) {
  const match = fs.readFileSync(path.join(OUT_DIR, prevWeekFile), "utf8").match(/```([\s\S]*?)```/);
  if (match) prevFiles = match[1].trim().split("\n");
}

const diff = summarizeDiff(prevFiles, files);
const dateStr = today.toISOString().replace("T", " ").slice(0, 16);
const header = `# 🪶 Vibeflow Handoff (Enriched) — ${dateStr}
## Totals
- Files: ${files.length}
- Repo: ${process.env.GITHUB_REPOSITORY || "local"}

## 📦 Recent Changes
${diff}

---

<details><summary>Current File Tree</summary>

\`\`\`
${files.join("\n")}
\`\`\`

</details>
`;

let weekContent = "";
try { weekContent = fs.readFileSync(weekFile, "utf8"); } catch {}
fs.writeFileSync(weekFile, `${header}\n\n${weekContent}`);
fs.writeFileSync(latestFile, header);
console.log(`✅ Updated: ${weekFile}`);
console.log(`✅ Latest digest: ${latestFile}`);

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
