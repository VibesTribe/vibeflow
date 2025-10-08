// scripts/generate-openspec-digest.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SPEC_DIR = path.join(ROOT, "openspec", "specs");
const CHG_DIR  = path.join(ROOT, "openspec", "changes");
const OUT_MD   = path.join(ROOT, "docs", "updates", "OPEN_SPEC_DIGEST.md");
const OUT_JSON = path.join(ROOT, "data", "state", "openspec.index.json");

async function listMarkdown(dir){
  try {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) out.push(...await listMarkdown(p));
      else if (/\.(md|markdown)$/i.test(e.name)) out.push(p);
    }
    return out;
  } catch { return []; }
}

function extractTitleAndSummary(text){
  const lines = text.split(/\r?\n/);
  let title = null;
  for (const l of lines) {
    const m = l.match(/^#\s+(.*)/);
    if (m) { title = m[1].trim(); break; }
  }
  const paragraphs = text.split(/\r?\n\r?\n/).map(s => s.trim());
  let summary = paragraphs.find(p => p && !p.startsWith("#")) || "";
  if (summary.length > 300) summary = summary.slice(0, 297) + "...";
  return { title: title || "(untitled)", summary };
}

async function main(){
  const [specFiles, changeFiles] = await Promise.all([listMarkdown(SPEC_DIR), listMarkdown(CHG_DIR)]);
  const specs = [];
  for (const f of specFiles){
    try {
      const txt = await fs.readFile(f, "utf8");
      const st = await fs.stat(f);
      const { title, summary } = extractTitleAndSummary(txt);
      specs.push({ path: path.relative(ROOT, f), title, summary, mtime: st.mtimeMs|0 });
    } catch {}
  }
  const changes = [];
  for (const f of changeFiles){
    try {
      const txt = await fs.readFile(f, "utf8");
      const st = await fs.stat(f);
      const { title, summary } = extractTitleAndSummary(txt);
      changes.push({ path: path.relative(ROOT, f), title, summary, mtime: st.mtimeMs|0 });
    } catch {}
  }
  specs.sort((a,b)=>b.mtime-a.mtime);
  changes.sort((a,b)=>b.mtime-a.mtime);

  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, JSON.stringify({ timestamp: new Date().toISOString(), specs, changes }, null, 2), "utf8");

  await fs.mkdir(path.dirname(OUT_MD), { recursive: true });
  const md = [
    "# OpenSpec Digest",
    "",
    "## Latest Proposed Changes",
    ...changes.slice(0, 20).map(c => `- **${c.title}** — ${c.summary}  \n  _${c.path}_`),
    "",
    "## Current Specs (recently updated)",
    ...specs.slice(0, 20).map(s => `- **${s.title}** — ${s.summary}  \n  _${s.path}_`),
    ""
  ].join("\n");
  await fs.writeFile(OUT_MD, md, "utf8");

  console.log("Wrote", path.relative(ROOT, OUT_MD));
  console.log("Wrote", path.relative(ROOT, OUT_JSON));
}

main().catch(err => { console.error(err); process.exit(1); });
