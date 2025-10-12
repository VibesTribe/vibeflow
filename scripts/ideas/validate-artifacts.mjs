#!/usr/bin/env node
import path from 'path';
import fs from 'fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ajv = new Ajv2020({ strict: false });
addFormats(ajv);

const ROOT = process.cwd();
const IDEA_DIR = process.argv[2];

if (!IDEA_DIR) {
  console.error('Usage: npm run ideas:validate -- <idea_dir>');
  process.exit(1);
}

async function loadSchema(relPath) {
  const content = await fs.readFile(path.join(ROOT, relPath), 'utf8');
  return JSON.parse(content);
}

async function loadJson(relPath) {
  const content = await fs.readFile(path.join(ROOT, relPath), 'utf8');
  return JSON.parse(content);
}

async function main() {
  const base = path.join('data/ideas', IDEA_DIR);
  const schemaPaths = {
    research: 'docs/schemas/research.brief.schema.json',
    analyst: 'docs/schemas/analyst.review.schema.json',
    prd: 'docs/schemas/prd.summary.schema.json',
    status: 'docs/schemas/idea.status.schema.json'
  };

  const validators = {
    research: ajv.compile(await loadSchema(schemaPaths.research)),
    analyst: ajv.compile(await loadSchema(schemaPaths.analyst)),
    prd: ajv.compile(await loadSchema(schemaPaths.prd)),
    status: ajv.compile(await loadSchema(schemaPaths.status))
  };

  const artefacts = {
    research: await loadJson(path.join(base, 'research.brief.json')),
    analyst: await loadJson(path.join(base, 'analyst.review.json')),
    prd: await loadJson(path.join(base, 'prd.summary.json')),
    status: await loadJson(path.join(base, 'status.json'))
  };

  Object.entries(validators).forEach(([key, validate]) => {
    const data = artefacts[key];
    if (!validate(data)) {
      console.error(`Validation failed for ${key}:`, validate.errors);
      process.exitCode = 1;
    }
  });

  if (process.exitCode) {
    return;
  }

  const expectedStages = ['idea_submitted', 'research_completed', 'analyst_approved', 'prd_approved'];
  const stages = artefacts.status.history.map((entry) => entry.stage);
  for (const stage of expectedStages) {
    if (!stages.includes(stage)) {
      console.error(`Status history missing stage ${stage}`);
      process.exitCode = 1;
    }
  }

  if (!process.exitCode) {
    console.log(`Idea '${IDEA_DIR}' artifacts validated.`);
  }
}

main().catch((err) => {
  console.error('[ideas:validate] failed:', err);
  process.exit(1);
});
