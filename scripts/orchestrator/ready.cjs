#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { loadOrchestratorContext } = require('../../src/orchestrator/runtime');

const ideaId = process.argv[2];
if (!ideaId) {
  console.error("Usage: npm run orchestrator:ready -- <idea_id>");
  process.exit(1);
}

async function main() {
  try {
    const context = await loadOrchestratorContext(ideaId);
    console.log(`[orchestrator:ready] Idea '${context.ideaId}' ready with ${context.slices.length} slice(s).`);
    context.slices.forEach((slice) => {
      console.log(` - ${slice.sliceId}: ${slice.taskPackets.length} task packets`);
    });
  } catch (error) {
    console.error('[orchestrator:ready] failed:', error.message ?? error);
    process.exit(1);
  }
}

main();
