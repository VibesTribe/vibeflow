#!/usr/bin/env node
const path = require('path');
const fs = require('fs/promises');
require('ts-node/register/transpile-only');

const { readPlannerConfig, writePlanArtifacts } = require('../../src/planner/planBuilder');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { input: 'planner/examples/shared-context.json', output: 'data/taskpackets' };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];
    if ((arg === '--input' || arg === '-i') && next) {
      options.input = next;
      i += 1;
    } else if ((arg === '--output' || arg === '-o') && next) {
      options.output = next;
      i += 1;
    }
  }
  return options;
}

async function main() {
  const { input, output } = parseArgs();
  const root = process.cwd();
  const inputPath = path.resolve(root, input);
  const outputRoot = path.resolve(root, output);

  const config = await readPlannerConfig(inputPath);
  await fs.mkdir(outputRoot, { recursive: true });
  const artifacts = await writePlanArtifacts(config, outputRoot);

  const planDir = config.ideaId ? path.join(outputRoot, config.ideaId, config.slice.id) : path.join(outputRoot, config.slice.id);

  console.log(`Plan generated for slice ${config.slice.id}`);
  console.log(` - plan: ${path.relative(root, path.join(planDir, 'plan.json'))}`);
  Object.keys(artifacts.taskPackets).forEach((taskId) => {
    console.log(` - task packet: ${path.relative(root, path.join(planDir, `${taskId}.json`))}`);
  });
}

main().catch((error) => {
  console.error('[planner:generate] failed:', error.message);
  process.exit(1);
});
