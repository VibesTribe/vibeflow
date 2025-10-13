#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { queueAssignmentsForIdea } = require('../../src/orchestrator/dispatcher');

function parseArgs(argv) {
  const args = [...argv];
  const options = { dryRun: false };
  const idea = args.shift();
  while (args.length) {
    const flag = args.shift();
    if (flag === '--dry-run') {
      options.dryRun = true;
    }
  }
  return { ideaId: idea, options };
}

async function main() {
  const { ideaId, options } = parseArgs(process.argv.slice(2));
  if (!ideaId) {
    console.error('Usage: npm run orchestrator:assign -- <idea_id> [--dry-run]');
    process.exit(1);
  }
  try {
    const assignments = await queueAssignmentsForIdea(ideaId, options);
    if (assignments.length === 0) {
      console.log(`[orchestrator:assign] No tasks found for ${ideaId}.`);
    } else {
      console.log(`[orchestrator:assign] Queued ${assignments.length} task(s) for ${ideaId}.`);
      assignments.forEach((assignment) => {
        console.log(` - ${assignment.taskId} -> ${assignment.channel} (${assignment.platform})`);
      });
      if (options.dryRun) {
        console.log('[orchestrator:assign] Dry run; no files or logs were written.');
      }
    }
  } catch (error) {
    console.error('[orchestrator:assign] failed:', error.message ?? error);
    process.exit(1);
  }
}

main();
