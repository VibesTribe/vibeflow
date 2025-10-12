#!/usr/bin/env node
/**
 * Sync dashboard-facing state JSON from data/ into docs/state for GitHub Pages.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const SOURCE_DIRS = [path.join(ROOT, 'data', 'state'), path.join(ROOT, 'data', 'metrics')];
const TARGET_BASE = path.join(ROOT, 'docs', 'state');

async function removeChildren(dir) {
  try {
    const entries = await fs.readdir(dir);
    await Promise.all(entries.map((entry) => fs.rm(path.join(dir, entry), { recursive: true, force: true })));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function copyRecursive(src, dest) {
  let stats;
  try {
    stats = await fs.stat(src);
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }
  if (!stats.isDirectory()) return;

  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(from, to);
    } else if (entry.isFile()) {
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to);
    }
  }
}

async function main() {
  await fs.mkdir(TARGET_BASE, { recursive: true });
  await removeChildren(TARGET_BASE);

  for (const dir of SOURCE_DIRS) {
    const subdirName = path.basename(dir);
    const target = path.join(TARGET_BASE, subdirName);
    await copyRecursive(dir, target);
  }

  console.log('Dashboard state sync complete.');
}

main().catch((error) => {
  console.error('[pages:sync] failed:', error);
  process.exit(1);
});
