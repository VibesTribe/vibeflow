#!/usr/bin/env node
/**
 * Validate that requested secrets exist in data/tasks/secrets-registry.json.
 * Usage: node scripts/guardrails/validate-secrets.mjs SUPABASE_URL BREVO_API_KEY
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

async function loadRegistry() {
  const registryPath = path.join(ROOT, 'data', 'tasks', 'secrets-registry.json');
  try {
    const raw = await (await import('fs/promises')).readFile(registryPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function main() {
  const requested = process.argv.slice(2).filter(Boolean);
  if (!requested.length) {
    console.log('No secrets provided.');
    return;
  }

  const registry = await loadRegistry();
  const set = new Set(registry.map((record) => record.name));
  const missing = requested.filter((name) => !set.has(name));

  if (missing.length) {
    console.error('Missing secrets:', missing.join(', '));
    process.exit(1);
  }
  console.log('All secrets registered.');
}

main().catch((error) => {
  console.error('[guardrails:secrets] failed:', error);
  process.exit(1);
});
