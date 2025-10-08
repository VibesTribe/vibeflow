// scripts/validate-secrets.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CANDIDATES_DIR = path.join(ROOT, "__candidates__");
const REGISTRY = path.join(ROOT, "config", "secrets-registry.json");

const ENV_RE = /process\.env\.([A-Z0-9_]+)/g;

async function* walk(dir){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for(const e of entries){
    const p = path.join(dir, e.name);
    if(e.isDirectory()) yield* walk(p);
    else yield p;
  }
}

async function main(){
  let reg = {};
  try { reg = JSON.parse(await fs.readFile(REGISTRY, "utf8")); }
  catch { console.error("✖ Missing secrets registry:", REGISTRY); process.exit(1); }

  const unknown = new Map();
  for await (const f of walk(CANDIDATES_DIR)){
    if(!/\.(js|ts|json|yml|yaml|mjs|cjs|tsx|jsx)$/.test(f)) continue;
    const txt = await fs.readFile(f, "utf8");
    const seen = new Set();
    let m;
    while((m = ENV_RE.exec(txt))){
      const name = m[1];
      if(seen.has(name)) continue;
      seen.add(name);
      if(!(name in reg)){
        if(!unknown.has(name)) unknown.set(name, []);
        unknown.get(name).push(path.relative(ROOT, f));
      }
    }
  }

  if(unknown.size){
    console.error("✖ Unknown env names found in candidates:");
    for(const [name, files] of unknown){
      console.error(`  - ${name}:`);
      for(const f of files) console.error(`      • ${f}`);
    }
    process.exit(1);
  }
  console.log("✔ Secrets look good.");
}

main().catch(e => { console.error(e); process.exit(1); });
