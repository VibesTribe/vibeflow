#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import process from "process";

async function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error("[auto_backup] provide at least one path to back up");
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupRoot = path.resolve("data/backups", stamp);
  await fs.mkdir(backupRoot, { recursive: true });

  for (const input of inputs) {
    const absolute = path.resolve(input);
    try {
      const stats = await fs.stat(absolute);
      if (!stats.isFile()) {
        continue;
      }
      const target = path.join(backupRoot, path.relative(process.cwd(), absolute));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(absolute, target);
      console.log(`[auto_backup] backed up ${input}`);
    } catch (error) {
      console.warn(`[auto_backup] skipped ${input}: ${error.message}`);
    }
  }
}

main();
