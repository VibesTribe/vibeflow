#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { completeTestAssignment } = require('../../src/testAgent/complete');
const { loadInProgressTestRecord } = require('../../src/testAgent/claim');

function printUsage() {
  console.log('Usage: npm run test:complete -- --idea <idea_id> --task <task_id> --attempt <source_attempt> --test-attempt <test_attempt> --status <success|failed> [--notes <text>] [--dry-run] [--json]');
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    ideaId: undefined,
    taskId: undefined,
    attempt: undefined,
    testAttempt: undefined,
    status: undefined,
    notes: undefined,
    dryRun: false,
    json: false
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
      case '--attempt':
        options.attempt = Number(args.shift());
        break;
      case '--test-attempt':
        options.testAttempt = Number(args.shift());
        break;
      case '--status':
        options.status = args.shift();
        break;
      case '--notes':
        options.notes = args.shift();
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
  return options;
}

async function resolveAttempts(options) {
  if (options.attempt && options.testAttempt) {
    return options;
  }
  if (!options.ideaId || !options.taskId) {
    throw new Error('Provide --idea, --task, --attempt, and --test-attempt.');
  }
  const attempt = options.attempt ?? 1;
  const testAttempt = options.testAttempt ?? 1;
  const record = await loadInProgressTestRecord(options.ideaId, options.taskId, attempt, testAttempt);
  if (!record) {
    throw new Error('Unable to locate in-progress record. Specify --attempt and --test-attempt explicitly.');
  }
  return { ...options, attempt, testAttempt };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.ideaId || !parsed.taskId || !parsed.status) {
    printUsage();
    process.exit(1);
  }
  if (!['success', 'failed'].includes(parsed.status)) {
    console.error('--status must be success or failed');
    process.exit(1);
  }

  const resolved = await resolveAttempts(parsed);

  const result = await completeTestAssignment({
    ideaId: resolved.ideaId,
    taskId: resolved.taskId,
    attempt: resolved.attempt,
    testAttempt: resolved.testAttempt,
    status: resolved.status,
    notes: resolved.notes,
    dryRun: resolved.dryRun
  });

  if (resolved.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[test:complete] ${result.dryRun ? 'Previewed' : 'Recorded'} ${resolved.status} for ${resolved.ideaId}/${resolved.taskId} (attempt ${resolved.attempt}, test ${resolved.testAttempt}).`);
  if (resolved.notes) {
    console.log(`  notes: ${resolved.notes}`);
  }
  if (!result.dryRun && resolved.status === 'failed' && result.requeued) {
    const nextAttempt = resolved.testAttempt + 1;
    console.log(`  requeued test attempt ${nextAttempt} in data/tasks/tests/queued/${resolved.ideaId}/${resolved.taskId}.attempt-${String(resolved.attempt).padStart(2, '0')}.test-${String(nextAttempt).padStart(2, '0')}.json`);
  }
}

main().catch((error) => {
  console.error('[test:complete] failed:', error.message ?? error);
  process.exit(1);
});
