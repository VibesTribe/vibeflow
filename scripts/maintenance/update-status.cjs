#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { updateStatusRecord } = require('../../src/maintenance/status');

function parseArgs(argv) {
  const args = { tags: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(Missing value for --);
    }
    i += 1;
    if (key === 'tags') {
      args.tags.push(value);
    } else {
      args[key] = value;
    }
  }
  if (!args.id) {
    throw new Error('Missing required --id');
  }
  return args;
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  const updates = {};
  if (argv.status) updates.status = argv.status;
  if (argv.notes) updates.notes = argv.notes;
  if (argv.priority) updates.priority = argv.priority;
  if (argv.url) updates.url = argv.url;
  if (argv.tags && argv.tags.length) updates.tags = argv.tags;

  const record = await updateStatusRecord(argv.id, updates);
  if (!record) {
    console.error([maintenance:update-status] record  not found.);
    process.exit(1);
  }
  console.log([maintenance:update-status] updated : );
}

main().catch((error) => {
  console.error('[maintenance:update-status] failed:', error.message ?? error);
  process.exit(1);
});
