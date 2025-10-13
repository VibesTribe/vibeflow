#!/usr/bin/env node
/**
 * Import the latest research digest from the knowledgebase repo and drop it into data/maintenance/inbox.
 * Requires KNOWLEDGEBASE_ROOT to point at the knowledgebase checkout (directory containing `digest/latest/digest.json`).
 */
const fs = require('fs/promises');
const path = require('path');

const vibeflowRoot = process.env.VIBEFLOW_ROOT ?? process.cwd();
const knowledgeRoot = process.env.KNOWLEDGEBASE_ROOT;

if (!knowledgeRoot) {
  console.error('[maintenance:import-digest] Missing KNOWLEDGEBASE_ROOT environment variable.');
  process.exit(1);
}

async function resolveLatestDigest() {
  const explicit = process.argv.find((arg) => arg.startsWith('--digest='));
  if (explicit) {
    const value = explicit.split('=')[1];
    if (!value) {
      throw new Error('--digest flag provided without a path');
    }
    return path.resolve(value);
  }
  return path.join(knowledgeRoot, 'digest', 'latest', 'digest.json');
}

async function main() {
  const digestPath = await resolveLatestDigest();
  let raw;
  try {
    raw = await fs.readFile(digestPath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to read digest at ${digestPath}: ${error.message ?? error}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Digest file is not valid JSON: ${error.message ?? error}`);
  }

  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  const fileName = `${timestamp}-digest.json`;
  const inboxDir = path.join(vibeflowRoot, 'data', 'maintenance', 'inbox');
  const targetPath = path.join(inboxDir, fileName);

  await fs.mkdir(inboxDir, { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify({
    source: 'knowledgebase-digest',
    imported_at: new Date().toISOString(),
    digest_path: path.relative(vibeflowRoot, digestPath),
    payload: parsed
  }, null, 2) + '\n', 'utf8');

  console.log(`[maintenance:import-digest] Imported digest -> ${path.relative(vibeflowRoot, targetPath)}`);
}

main().catch((error) => {
  console.error('[maintenance:import-digest] failed:', error.message ?? error);
  process.exit(1);
});
