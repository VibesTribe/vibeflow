// scripts/generate-repo-snapshot.mjs
// Walks the repo and writes docs/reports/repo-snapshot.json (paths, sizes, mtimes).
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "reports");
const OUT_FILE = path.join(OUT_DIR, "repo-snapshot.json");

const IGNORE = new Set([".git","node_modules","dist","build",".next",".cache",".DS_Store",".github"]);

async function* walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for(const e of entries){
    if(IGNORE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function main(){
  const files = [];
  for await (const f of walk(ROOT)){
    try {
      const st = await fs.stat(f);
      files.push({ path: path.relative(ROOT, f), size: st.size, mtime: Math.floor(st.mtimeMs) });
    } catch {}
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify({ timestamp: new Date().toISOString(), files }, null, 2), "utf8");
  console.log("Wrote", path.relative(ROOT, OUT_FILE));
}

main().catch(err => { console.error(err); process.exit(1); });
