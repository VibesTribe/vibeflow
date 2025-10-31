#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const REPAIR_RECIPES = {
  "E/SCHEMA_INVALID": {
    title: "Resolve schema validation failure",
    objectives: [
      "Identify the schema violations reported by CI",
      "Patch offending documents or update schema expectations",
      "Re-run npm run validate:schemas and ensure success"
    ],
    deliverables: ["contracts/", "data/"],
    rollback: {
      commands: [
        "git checkout -- contracts/",
        "git checkout -- data/"
      ],
      description: "Restore schema and data directories to last known good state"
    }
  },
  "E/SELECTOR_CHANGED": {
    title: "Refresh visual selectors",
    objectives: [
      "Capture the latest DOM snapshot for the failing scenario",
      "Update visual_execution runner selectors and ok-probes",
      "Re-run visual regression tests"
    ],
    deliverables: ["skills/visual_execution.runner.mjs", "data/conversations/"],
    rollback: {
      commands: [
        "git checkout -- skills/visual_execution.runner.mjs",
        "git checkout -- data/conversations/"
      ],
      description: "Revert visual runner and captured artifacts"
    }
  }
};

function usage() {
  console.error("Usage: node scripts/repair_from_reason.mjs <reason_code> [--out <file>]");
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  usage();
}

const reason = args[0];
const recipe = REPAIR_RECIPES[reason];
if (!recipe) {
  console.error(`No repair recipe for ${reason}`);
  process.exit(1);
}

let outputPath;
const outIndex = args.indexOf("--out");
if (outIndex !== -1) {
  outputPath = args[outIndex + 1];
  if (!outputPath) {
    console.error("--out requires a file path");
    process.exit(1);
  }
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
if (!outputPath) {
  const repairsRoot = path.resolve("data/repairs");
  mkdirSync(repairsRoot, { recursive: true });
  const reasonSlug = reason.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  outputPath = path.join(repairsRoot, `repair-${reasonSlug || "reason"}-${timestamp}.json`);
}

const repairTaskId = `repair/${reason.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${timestamp}`;

const payload = {
  reason,
  createdAt: new Date().toISOString(),
  repairTask: {
    taskId: repairTaskId,
    title: recipe.title,
    objectives: recipe.objectives,
    deliverables: recipe.deliverables,
    confidence: 0.97,
    metadata: {
      generatedBy: "repair_from_reason",
      reasonCode: reason
    }
  },
  rollback: {
    required: true,
    description: recipe.rollback.description,
    commands: recipe.rollback.commands
  }
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");

console.log(JSON.stringify({ outputPath, ...payload }, null, 2));
