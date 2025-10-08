// scripts/plan-apply.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const CANDIDATES_DIR = path.join(ROOT, "__candidates__");
const REPORT = path.join(ROOT, "docs", "reports", `safe-apply-plan-${Date.now()}.md`);

async function fileInfo(p){
  try {
    const st = await fs.stat(p);
    return `size:${st.size}:mtime:${Math.floor(st.mtimeMs/1000)}`;
  } catch { return null; }
}

async function main(){
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  await fs.mkdir(path.dirname(REPORT), { recursive: true });
  let lines = ["# Safe Apply — Dry Run Report\\n"];
  for(const item of manifest.files){
    const target = path.join(ROOT, item.target);
    const candidate = path.join(ROOT, item.candidate || path.join(CANDIDATES_DIR, item.target));
    const existsCandidate = !!(await fileInfo(candidate));
    const existsTarget = !!(await fileInfo(target));
    const liveInfo = existsTarget ? await fileInfo(target) : null;
    const baselineOk = item.baseline_hash ? (liveInfo === item.baseline_hash) : true;

    lines.push(`## ${item.target}`);
    lines.push(`- Candidate: ${existsCandidate ? "found" : "**MISSING**"} (${path.relative(ROOT, candidate)})`);
    lines.push(`- Target: ${existsTarget ? "found" : "**MISSING**"} (${path.relative(ROOT, target)})`);
    if(item.baseline_hash){
      lines.push(`- Baseline required: \\`${item.baseline_hash}\\``);
      lines.push(`- Live file info: \\`${liveInfo || "n/a"}\\``);
      lines.push(`- Baseline match: ${baselineOk ? "yes" : "**NO**"}`);
    } else {
      lines.push(`- Baseline: none (will back up and replace)`);
    }
    lines.push("");
  }
  await fs.writeFile(REPORT, lines.join("\\n"), "utf8");
  console.log("Wrote", REPORT);
}

main().catch(e => { console.error(e); process.exit(1); });
