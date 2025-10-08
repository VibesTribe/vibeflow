// scripts/safe-apply.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "manifest.json");
const CANDIDATES_DIR = path.join(ROOT, "__candidates__");
const BACKUPS_DIR = path.join(ROOT, "backups");
const SECRETS_REGISTRY = path.join(ROOT, "config", "secrets-registry.json");
const VALIDATE = path.join(ROOT, "scripts", "validate-secrets.mjs");

function err(m){ console.error("✖", m); }
function ok(m){ console.log("✔", m); }

async function fileInfo(p){
  const st = await fs.stat(p);
  return `size:${st.size}:mtime:${Math.floor(st.mtimeMs/1000)}`;
}

async function backupFile(target, backupRoot){
  await fs.mkdir(backupRoot, { recursive: true });
  const dst = path.join(backupRoot, target);
  await fs.mkdir(path.dirname(dst), { recursive: true });
  await fs.copyFile(target, dst);
  return dst;
}

async function runValidateSecrets(){
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [VALIDATE], { stdio: "inherit" });
    p.on("exit", (code) => code === 0 ? resolve() : reject(new Error("validate-secrets failed")));
  });
}

async function main(){
  const manifest = JSON.parse(await fs.readFile(MANIFEST, "utf8"));
  try { await fs.readFile(SECRETS_REGISTRY, "utf8"); }
  catch {
    err(`Missing secrets registry at ${SECRETS_REGISTRY}. Copy the example and fill it.`);
    process.exit(1);
  }

  // Run secrets validator first
  await runValidateSecrets();

  const ts = new Date().toISOString().replace(/[:.]/g,"-");
  const backupRoot = path.join(BACKUPS_DIR, ts);

  for(const item of manifest.files){
    const target = path.join(ROOT, item.target);
    const candidate = path.join(ROOT, item.candidate || path.join(CANDIDATES_DIR, item.target));
    try {
      await fs.access(candidate);
      await fs.access(target);

      if(item.baseline_hash){
        const liveInfo = await fileInfo(target);
        if(liveInfo !== item.baseline_hash){
          err(`Baseline mismatch for ${item.target}. Expected ${item.baseline_hash}, got ${liveInfo}. Skipping.`);
          continue;
        }
      }

      const bak = await backupFile(target, backupRoot);
      ok(`Backed up ${item.target} -> ${bak}`);
      await fs.copyFile(candidate, target);
      ok(`Applied ${item.target}`);
    } catch (e) {
      err(`Failed ${item.target}: ${e.message}`);
    }
  }

  console.log("\\nDone. Review, run tests, then commit.");
}

main().catch(e => { err(e.stack || e.message); process.exit(1); });
