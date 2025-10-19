// scripts/inventory.mjs
// Generates a JSON manifest of all repo files and prunes entries older than 7 days.

import fs from "node:fs";
import path from "node:path";

function walk(dir, arr = []) {
  for (const f of fs.readdirSync(dir)) {
    if (f === ".git" || f === "node_modules") continue;
    const p = path.join(dir, f);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, arr);
    else arr.push(p);
  }
  return arr;
}

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "updates", "inventory");
fs.mkdirSync(OUT_DIR, { recursive: true });

const files = walk(ROOT);
const snapshot = {
  timestamp: new Date().toISOString(),
  repo: process.env.GITHUB_REPOSITORY || "local",
  total_files: files.length,
  tree: files.map((p) => path.relative(ROOT, p)),
};

const date = new Date().toISOString().split("T")[0];
const outfile = path.join(OUT_DIR, `file_inventory_${date}.json`);
fs.writeFileSync(outfile, JSON.stringify(snapshot, null, 2));
console.log(`✅ Inventory written to ${outfile}`);

// --- prune anything older than 7 days ---
const keepMs = 7 * 24 * 60 * 60 * 1000;
for (const f of fs.readdirSync(OUT_DIR)) {
  const fp = path.join(OUT_DIR, f);
  const stat = fs.statSync(fp);
  if (Date.now() - stat.mtimeMs > keepMs) {
    fs.unlinkSync(fp);
    console.log(`🗑️  Removed old snapshot ${f}`);
  }
}
