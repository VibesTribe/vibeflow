#!/usr/bin/env node
require('ts-node/register/transpile-only');

const fs = require('fs');
const path = require('path');
const { completeAssignment, loadInProgressRecord } = require('../../src/taskAgent/complete');

function printUsage() {
  console.log('Usage: npm run task:complete -- --idea <idea_id> --task <task_id> --status <success|failed> [options]');
  console.log('Options:');
  console.log('  --cost <usd>                 Actual spend in USD');
  console.log('  --prompt-tokens <count>      Prompt tokens used');
  console.log('  --completion-tokens <count>  Completion tokens used');
  console.log('  --reason <text>              Failure reason (e.g. credits_exhausted)');
  console.log('  --branch <name>              Branch used for the task');
  console.log('  --meta key=value             Add metadata entry (repeatable)');
  console.log('  --metadata-file <path>       Merge metadata from JSON file');
  console.log('  --dry-run                    Preview without recording completion');
  console.log('  --json                       Output payload/result as JSON');
}

function coerceValue(value) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (!Number.isNaN(Number(value)) && value.trim() !== '') {
    return Number(value);
  }
  return value;
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    ideaId: undefined,
    taskId: undefined,
    status: undefined,
    costUsd: undefined,
    promptTokens: undefined,
    completionTokens: undefined,
    reason: undefined,
    branch: undefined,
    dryRun: false,
    json: false,
    metadata: {},
    metadataFiles: []
  };

  while (args.length) {
    const flag = args.shift();
    switch (flag) {
      case '--idea':
        options.ideaId = args.shift();
        break;
      case '--task':
        options.taskId = args.shift();
        break;
      case '--status':
        options.status = args.shift();
        break;
      case '--cost':
        options.costUsd = Number(args.shift());
        break;
      case '--prompt-tokens':
        options.promptTokens = Number(args.shift());
        break;
      case '--completion-tokens':
        options.completionTokens = Number(args.shift());
        break;
      case '--reason':
        options.reason = args.shift();
        break;
      case '--branch':
        options.branch = args.shift();
        break;
      case '--meta': {
        const entry = args.shift();
        if (!entry || !entry.includes('=')) {
          throw new Error('--meta expects key=value');
        }
        const [key, ...rest] = entry.split('=');
        options.metadata[key] = coerceValue(rest.join('='));
        break;
      }
      case '--metadata-file':
        options.metadataFiles.push(args.shift());
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
      default:
        console.error(`Unknown flag: ${flag}`);
        printUsage();
        process.exit(1);
    }
  }

  if (!options.ideaId || !options.taskId || !options.status) {
    throw new Error('Missing required flags --idea, --task, or --status');
  }

  if (!['success', 'failed'].includes(options.status)) {
    throw new Error('--status must be success or failed');
  }

  if (options.costUsd !== undefined && Number.isNaN(options.costUsd)) {
    throw new Error('--cost must be a number');
  }
  if (options.promptTokens !== undefined && Number.isNaN(options.promptTokens)) {
    throw new Error('--prompt-tokens must be a number');
  }
  if (options.completionTokens !== undefined && Number.isNaN(options.completionTokens)) {
    throw new Error('--completion-tokens must be a number');
  }

  return options;
}

async function loadMetadataFiles(paths) {
  const merged = {};
  for (const filePath of paths) {
    if (!filePath) continue;
    const absolute = path.resolve(process.cwd(), filePath);
    const raw = await fs.promises.readFile(absolute, 'utf8');
    Object.assign(merged, JSON.parse(raw));
  }
  return merged;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error('[task:complete] ' + (error.message ?? error));
    printUsage();
    process.exit(1);
  }

  const metadataFromFiles = await loadMetadataFiles(options.metadataFiles);
  const metadata = { ...metadataFromFiles, ...options.metadata };

  const tokens = {};
  if (options.promptTokens !== undefined) tokens.prompt = options.promptTokens;
  if (options.completionTokens !== undefined) tokens.completion = options.completionTokens;

  const record = await loadInProgressRecord(options.ideaId, options.taskId);
  if (!record) {
    console.error(`[task:complete] No in-progress record found for ${options.ideaId}/${options.taskId}. Claim the task first.`);
    process.exit(1);
  }

  const result = await completeAssignment({
    ideaId: options.ideaId,
    taskId: options.taskId,
    status: options.status,
    costUsd: options.costUsd,
    tokens: Object.keys(tokens).length ? tokens : undefined,
    reason: options.reason,
    branchUsed: options.branch,
    metadata: Object.keys(metadata).length ? metadata : undefined,
    dryRun: options.dryRun
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[task:complete] ${result.dryRun ? 'Previewed' : 'Recorded'} completion for ${options.ideaId}/${options.taskId}.`);
  if (result.result?.fallbackUsed) {
    console.log(`  fallback: ${result.result.fallbackUsed}`);
  }
  if (result.payload.tokens) {
    console.log(`  tokens prompt=${result.payload.tokens.prompt ?? 0} completion=${result.payload.tokens.completion ?? 0}`);
  }
  if (result.payload.cost_usd !== undefined) {
    console.log(`  cost: $${result.payload.cost_usd}`);
  }
  if (result.payload.reason) {
    console.log(`  reason: ${result.payload.reason}`);
  }
  if (result.dryRun) {
    console.log('[task:complete] Dry run – in-progress record preserved.');
  }
}

main().catch((error) => {
  console.error('[task:complete] failed:', error.message ?? error);
  process.exit(1);
});
