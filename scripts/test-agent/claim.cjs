#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { claimTestAssignment, listQueuedTestAssignments } = require('../../src/testAgent/claim');

function printUsage() {
  console.log('Usage: npm run test:claim [-- --idea <idea_id>] [--task <task_id>] [--dry-run] [--list] [--json]');
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {
    ideaId: undefined,
    taskId: undefined,
    dryRun: false,
    list: false,
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
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--list':
        options.list = true;
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

function renderAssignment(payload) {
  const lines = [];
  lines.push(`idea: ${payload.idea_id}`);
  lines.push(`task: ${payload.task_id}`);
  lines.push(`source attempt: ${payload.source_attempt}`);
  lines.push(`test attempt: ${payload.test_attempt}`);
  if (payload.branch?.test) {
    lines.push(`test branch: ${payload.branch.test}`);
  }
  if (payload.validations?.length) {
    lines.push('validations:');
    payload.validations.forEach((validation) => {
      lines.push(`  - ${validation.name ?? 'validation'} -> ${validation.tool}`);
    });
  }
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.list) {
    const queued = await listQueuedTestAssignments(options.ideaId);
    if (options.json) {
      console.log(JSON.stringify(queued, null, 2));
      return;
    }
    if (!queued.length) {
      console.log('[test:claim] No queued test assignments found.');
      return;
    }
    console.log(`[test:claim] ${queued.length} assignment(s) queued.`);
    queued.forEach((assignment, index) => {
      console.log(`\n[${index + 1}] ${assignment.idea_id}/${assignment.task_id}`);
      console.log(renderAssignment(assignment));
    });
    return;
  }

  const result = await claimTestAssignment({
    ideaId: options.ideaId,
    taskId: options.taskId,
    dryRun: options.dryRun
  });

  if (!result) {
    console.log('[test:claim] No queued test assignments found.');
    return;
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const { record, dryRun } = result;
  console.log(`[test:claim] ${dryRun ? 'Previewed' : 'Claimed'} test assignment for ${record.idea_id}/${record.task_id} (source attempt ${record.source_attempt}, test attempt ${record.test_attempt}).`);
  console.log(renderAssignment(record));
  if (dryRun) {
    console.log('[test:claim] Dry run – queue entry left untouched.');
  } else {
    console.log(`[test:claim] In-progress record written under data/tasks/tests/in-progress/${record.idea_id}/` +
      `${record.task_id}.attempt-${String(record.source_attempt).padStart(2, '0')}.test-${String(record.test_attempt).padStart(2, '0')}.json`);
  }
}

main().catch((error) => {
  console.error('[test:claim] failed:', error.message ?? error);
  process.exit(1);
});
