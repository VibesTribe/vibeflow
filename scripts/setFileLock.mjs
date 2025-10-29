#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const manifestPath = path.resolve("data/registry/system_manifest.json");

async function main() {
  const [filePath, state] = process.argv.slice(2);
  if (!filePath || !state) {
    console.error("Usage: node scripts/setFileLock.mjs <path> <true|false>");
    process.exit(1);
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const entry = manifest.files.find((item) => item.path === filePath);
  if (!entry) {
    console.error(`Manifest does not include ${filePath}`);
    process.exit(1);
  }

  entry.locked = state === "true";
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[setFileLock] ${filePath} locked=${entry.locked}`);
}

main();
