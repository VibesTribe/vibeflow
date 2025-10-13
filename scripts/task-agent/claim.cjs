#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { claimAssignment, listQueuedAssignments } = require('../../src/taskAgent/claim');

function printUsage() {
  console.log('Usage: npm run task:claim [-- --idea <idea_id>] [--task <task_id>] [--dry-run] [--branch-prefix <prefix>] [--list] [--json]');
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    dryRun: false,
    json: false,
    list: false,
    branchPrefix: undefined,
    ideaId: undefined,
    taskId: undefined
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
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--branch-prefix':
        options.branchPrefix = args.shift();
        break;
      case '--json':
        options.json = true;
        break;
      case '--list':
        options.list = true;
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

function renderBranch(branch) {
  return [
    `  work:   ${branch.work.suggested} (base ${branch.work.base})`,
    `  test:   ${branch.test.suggested} (base ${branch.test.base})`,
    `  review: ${branch.review.suggested} (base ${branch.review.base})`
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    const queued = await listQueuedAssignments(options.ideaId);
    if (options.json) {
      console.log(JSON.stringify(queued, null, 2));
      return;
    }
    if (!queued.length) {
      console.log('[task:claim] No queued assignments found.');
      return;
    }
    console.log(`[task:claim] ${queued.length} assignment(s) queued.`);
    queued.forEach((record) => {
      console.log(`- ${record.idea_id}/${record.task_id} (attempt ${record.attempt})`);
      console.log(renderBranch(record.branch));
    });
    return;
  }

  const result = await claimAssignment({
    ideaId: options.ideaId,
    taskId: options.taskId,
    branchPrefix: options.branchPrefix,
    dryRun: options.dryRun
  });

  if (!result) {
    console.log('[task:claim] No queued assignments found.');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const { record, dryRun } = result;
  console.log(`[task:claim] ${dryRun ? 'Previewed' : 'Claimed'} ${record.idea_id}/${record.task_id} (attempt ${record.attempt}).`);
  console.log(renderBranch(record.branch));
  console.log(`  platform: ${record.platform}`);
  console.log(`  model:    ${record.model}`);
  console.log(`  queue notes: ${record.payload.notes?.join(' | ') ?? 'n/a'}`);
  if (dryRun) {
    console.log('[task:claim] Dry run – queue file not moved.');
  } else {
    console.log(`[task:claim] In-progress record written under data/tasks/in-progress/${record.idea_id}/${record.task_id}.json`);
  }
}

main().catch((error) => {
  console.error('[task:claim] failed:', error.message ?? error);
  process.exit(1);
});
