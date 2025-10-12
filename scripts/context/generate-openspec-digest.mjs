#!/usr/bin/env node
/**
 * Generate OpenSpec digest artifacts for agents.
 * Outputs:
 *  - docs/updates/OPEN_SPEC_DIGEST.md
 *  - data/state/openspec.index.json
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const OPEN_SPEC_DIR = path.join(ROOT, 'openspec');
const DIGEST_MD = path.join(ROOT, 'docs', 'updates', 'OPEN_SPEC_DIGEST.md');
const INDEX_JSON = path.join(ROOT, 'data', 'state', 'openspec.index.json');

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function listMarkdownFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await listMarkdownFiles(full));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        files.push(full);
      }
    }
    return files;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function extractSummary(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/).map((line) => line.trim());
  const title = lines.find((line) => line.startsWith('#')) || path.basename(filePath);
  const summaryLine = lines.find((line) => line && !line.startsWith('#')) || '';
  return { title: title.replace(/^#+\s*/, ''), summary: summaryLine };
}

async function main() {
  const files = await listMarkdownFiles(OPEN_SPEC_DIR);
  const entries = [];
  for (const filePath of files) {
    const stats = await fs.stat(filePath);
    const { title, summary } = await extractSummary(filePath);
    entries.push({
      path: path.relative(ROOT, filePath).replace(/\\/g, '/'),
      title,
      summary,
      updated_at: stats.mtime.toISOString()
    });
  }

  entries.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const digestLines = [
    '# OpenSpec Digest',
    '',
    'Generated: ' + new Date().toISOString(),
    ''
  ];

  if (entries.length) {
    digestLines.push('| Spec | Last Updated | Summary |');
    digestLines.push('| --- | --- | --- |');
    for (const entry of entries) {
      digestLines.push('| [' + entry.title + '](' + entry.path + ') | ' + entry.updated_at + ' | ' + (entry.summary || '-') + ' |');
    }
  } else {
    digestLines.push('_No OpenSpec changes found._');
  }

  await ensureDir(DIGEST_MD);
  await fs.writeFile(DIGEST_MD, digestLines.join('\n'), 'utf8');

  await ensureDir(INDEX_JSON);
  const payload = {
    generated_at: new Date().toISOString(),
    count: entries.length,
    entries
  };
  await fs.writeFile(INDEX_JSON, JSON.stringify(payload, null, 2), 'utf8');

  console.log('OpenSpec digest updated with ' + entries.length + ' entries.');
}

main().catch((error) => {
  console.error('[openspec:digest] failed:', error);
  process.exit(1);
});
