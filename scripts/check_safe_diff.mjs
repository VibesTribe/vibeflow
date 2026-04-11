#!/usr/bin/env node

import { execSync } from "child_process";
import { promises as fs } from "fs";

function resolveFilesFromArgs() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args;
  }
  try {
    const output = execSync("git diff --name-only", { encoding: "utf8" });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    return [];
  }
}

async function validateFile(file) {
  const content = await fs.readFile(file, "utf8");
  if (!content.includes("@editable:")) {
    throw new Error(`${file} missing @editable region`);
  }
  if (!content.includes("vibeflow-meta")) {
    throw new Error(`${file} missing vibeflow-meta header`);
  }
}

async function main() {
  const files = resolveFilesFromArgs();
  if (files.length === 0) {
    console.log("[check_safe_diff] no files to validate");
    return;
  }
  for (const file of files) {
    try {
      await validateFile(file);
      console.log(`[check_safe_diff] ok ${file}`);
    } catch (error) {
      console.error(`[check_safe_diff] ${error.message}`);
      process.exitCode = 1;
    }
  }
}

main();
