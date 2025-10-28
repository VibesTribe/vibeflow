#!/usr/bin/env node
/**
 * Vibeflow Keep/Delete/Generate Comparator
 * ---------------------------------------
 * Compares the live repo (git ls-files or filesystem)
 * with docs/system_plan_v5.md manifest.
 * Outputs docs/keep_delete_v5.md with KEEP / DELETE / CREATE lists.
 *
 * Run:
 *   node scripts/compute_keep_delete.mjs --from-branch=codex
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const branchArg = args.find((a) => a.startsWith("--from-branch="));
const BRANCH = branchArg ? branchArg.split("=")[1] : "codex";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PLAN = path.join(ROOT, "docs", "system_plan_v5.md");
const MANIFEST = path.join(ROOT, "data", "registry", "system_manifest.json");
const OUT = path.join(ROOT, "docs", "keep_delete_v5.md");

if (!fs.existsSync(MANIFEST)) {
  console.error(`❌ Manifest not found. Run scripts/generate_manifest.mjs first.`);
  process.exit(1);
}

// load manifest
const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const plannedPaths = new Set(manifest.files.map((f) => f.path));

// list all files in repo (excluding node_modules/.git)
function listAllFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if ([".git", "node_modules"].includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) results = results.concat(listAllFiles(full));
    else results.push(path.relative(ROOT, full).replace(/\\/g, "/"));
  }
  return results;
}

const repoFiles = listAllFiles(ROOT);

// Compute sets
const keep = repoFiles.filter((f) => plannedPaths.has(f));
const deleteList = repoFiles.filter((f) => !plannedPaths.has(f) && !f.endsWith("keep_delete_v5.md"));
const create = [...plannedPaths].filter((f) => !repoFiles.includes(f));

const output = [
  `# Vibeflow Keep/Delete v5 (branch ${BRANCH})`,
  "",
  "## KEEP:",
  ...keep.map((f) => `- ${f}`),
  "",
  "## DELETE:",
  ...deleteList.map((f) => `- ${f}`),
  "",
  "## CREATE:",
  ...create.map((f) => `- ${f}`),
  "",
  `Generated: ${new Date().toISOString()}`
].join("\n");

// ensure dir
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, output);
console.log(`✅ keep_delete_v5.md written to ${OUT}`);
console.log(`→ KEEP ${keep.length} | DELETE ${deleteList.length} | CREATE ${create.length}`);
