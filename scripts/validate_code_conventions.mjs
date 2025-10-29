#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const FORBIDDEN_EXT = new Set([".js", ".jsx"]);

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const files = await walk(process.cwd());
  let violations = 0;
  for (const file of files) {
    const ext = path.extname(file);
    if (FORBIDDEN_EXT.has(ext)) {
      console.error(`[validate_code_conventions] Forbidden extension ${ext}: ${file}`);
      violations += 1;
    }
  }

  if (violations > 0) {
    process.exitCode = 1;
  } else {
    console.log("[validate_code_conventions] All clear");
  }
}

main();
