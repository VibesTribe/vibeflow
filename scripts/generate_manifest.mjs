#!/usr/bin/env node
/**
 * Vibeflow Manifest Generator
 * ---------------------------------------
 * Reads docs/system_plan_v5.md
 * Extracts all file paths shown in code fences
 * Emits data/registry/system_manifest.json
 *
 * Each entry includes:
 *   path, status="planned", locked=false, last_commit=null
 *
 * Run:
 *   node scripts/generate_manifest.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const PLAN = path.join(ROOT, "docs", "system_plan_v5.md");
const OUT = path.join(ROOT, "data", "registry", "system_manifest.json");

if (!fs.existsSync(PLAN)) {
  console.error(`❌ Cannot find ${PLAN}`);
  process.exit(1);
}

const text = fs.readFileSync(PLAN, "utf8");

// match all paths that look like `folder/file.ext` inside code fences
const regex = /^(?:[ \t]*)([A-Za-z0-9_.\-\/]+\/[A-Za-z0-9_.\-]+)$/gm;
const matches = [...text.matchAll(regex)].map((m) => m[1].trim());

// deduplicate and normalize
const unique = Array.from(new Set(matches))
  .filter((p) => !p.startsWith("```") && !p.endsWith("```"))
  .sort();

const manifest = unique.map((p) => ({
  path: p,
  status: "planned",
  locked: false,
  last_commit: null,
}));

// ensure output directory
const dir = path.dirname(OUT);
fs.mkdirSync(dir, { recursive: true });

// write manifest
fs.writeFileSync(OUT, JSON.stringify({ generated: new Date().toISOString(), files: manifest }, null, 2));
console.log(`✅ Manifest written to ${OUT}`);
console.log(`→ ${manifest.length} files enumerated`);
