#!/usr/bin/env node
require('ts-node/register/transpile-only');

const { validatePlannerOutput } = require('../../src/supervisor/planGate');

const ideaId = process.argv[2];
if (!ideaId) {
  console.error("Usage: npm run supervisor:gate -- <idea_id>");
  process.exit(1);
}

async function main() {
  try {
    const report = await validatePlannerOutput(ideaId);
    console.log(`[supervisor:gate] Plan approved for ${report.idea_id}`);
    console.log(`Report written to docs/reports/supervisor/${report.idea_id}.json`);
  } catch (error) {
    console.error('[supervisor:gate] failed:', error.message ?? error);
    process.exit(1);
  }
}

main();
