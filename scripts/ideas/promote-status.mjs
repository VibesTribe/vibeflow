#!/usr/bin/env node
import path from 'path';
import fs from 'fs/promises';

const ROOT = process.cwd();
const STAGES = [
  'idea_submitted',
  'research_completed',
  'analyst_approved',
  'prd_approved',
  'plan_generated',
  'supervisor_ready',
  'orchestration_started'
];

async function main() {
  const [ideaDir, nextStage] = process.argv.slice(2);
  if (!ideaDir || !nextStage) {
    console.error('Usage: npm run ideas:promote -- <idea_dir> <next_stage>');
    process.exit(1);
  }

  if (!STAGES.includes(nextStage)) {
    console.error(`Unknown stage '${nextStage}'. Allowed: ${STAGES.join(', ')}`);
    process.exit(1);
  }

  const statusPath = path.join(ROOT, 'data/ideas', ideaDir, 'status.json');
  let status;
  try {
    const raw = await fs.readFile(statusPath, 'utf8');
    status = JSON.parse(raw);
  } catch (error) {
    console.error(`[ideas:promote] unable to load status file: ${error.message}`);
    process.exit(1);
  }

  const currentIndex = STAGES.indexOf(status.stage);
  const nextIndex = STAGES.indexOf(nextStage);

  if (nextIndex === -1) {
    console.error(`Stage ${nextStage} not recognized.`);
    process.exit(1);
  }

  if (nextIndex <= currentIndex) {
    console.error(`Cannot move from ${status.stage} to ${nextStage} (must be forward).`);
    process.exit(1);
  }

  status.stage = nextStage;
  status.history = status.history || [];
  status.history.push({ stage: nextStage, timestamp: new Date().toISOString() });

  await fs.writeFile(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
  console.log(`Idea '${ideaDir}' advanced to ${nextStage}.`);
}

main().catch((error) => {
  console.error('[ideas:promote] failed:', error);
  process.exit(1);
});
