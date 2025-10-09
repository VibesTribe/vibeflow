// scripts/generate-handoff-index.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const UPD_DIR = path.join(ROOT, "docs", "updates");
const OUT = path.join(UPD_DIR, "INDEX.md");

async function main(){
  await fs.mkdir(UPD_DIR, { recursive: true });
  const all = await fs.readdir(UPD_DIR).catch(()=>[]);
  const files = all.filter(f => /^handoff_ENRICHED_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.md$/.test(f)).sort();
  const latest = files[files.length - 1];

  const lines = [
    "# Handoffs — Enriched Index",
    "",
    latest ? `**Latest:** [${latest}](./${latest})` : "_No handoffs yet_",
    "",
    "## All Handoffs",
    ...(files.slice().reverse().map(f => `- [${f}](./${f})`))
  ];

  await fs.writeFile(OUT, lines.join("\n") + "\n", "utf8");
  console.log("Wrote", path.relative(ROOT, OUT));
}

main().catch(err => { console.error(err); process.exit(1); });
