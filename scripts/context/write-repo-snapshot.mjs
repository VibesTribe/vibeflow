#!/usr/bin/env node
/**
 * Generate a repository snapshot containing file metadata for agents.
 * Output: docs/reports/repo-snapshot.json
 */
import { promises as fs } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'reports', 'repo-snapshot.json');
const IGNORED_DIRS = new Set(['.git', 'node_modules', 'dist', '.cache', '.vscode', '.idea']);

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function hashFile(filePath) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      const stats = await fs.stat(fullPath);
      const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
      const sha = await hashFile(fullPath);
      files.push({
        path: relPath,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        sha256: sha
      });
    }
  }
  return files;
}

function getGitInfo() {
  try {
    const commit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
    return { commit, branch };
  } catch (error) {
    return { commit: null, branch: null };
  }
}

async function main() {
  const files = await walk(ROOT);
  const totals = files.reduce(
    (acc, file) => {
      acc.bytes += file.size;
      const ext = path.extname(file.path) || 'NO_EXT';
      acc.byExtension[ext] = (acc.byExtension[ext] ?? 0) + 1;
      return acc;
    },
    { bytes: 0, byExtension: {} }
  );

  const payload = {
    generated_at: new Date().toISOString(),
    git: getGitInfo(),
    counts: {
      files: files.length,
      bytes: totals.bytes,
      by_extension: totals.byExtension
    },
    files
  };

  await ensureDir(OUTPUT_PATH);
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8');
  console.log('Repo snapshot written to ' + path.relative(ROOT, OUTPUT_PATH));
}

main().catch((error) => {
  console.error('[repo-snapshot] failed:', error);
  process.exit(1);
});
