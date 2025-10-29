#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import process from "process";

const DEFAULT_PLAN_PATH = "docs/system_plan_v5.md";
const DEFAULT_OUTPUT_PATH = "data/registry/system_manifest.json";

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i++) {
    const [key, value] = argv[i].split("=");
    if (value === undefined) {
      args.set(key.replace(/^--/, ""), true);
    } else {
      args.set(key.replace(/^--/, ""), value);
    }
  }
  return args;
}

function extractTargetTree(planContent) {
  const anchor = "## 7) Target File Tree";
  const subsection = planContent.split(anchor)[1];
  if (!subsection) {
    throw new Error("Unable to locate 'Target File Tree' section in plan.");
  }

  const terminator = "### 7.1";
  const targetSection = subsection.split(terminator)[0] ?? subsection;

  const treeBlocks = [];
  const regex = /```([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(targetSection)) !== null) {
    const block = match[1].trim();
    if (block) {
      treeBlocks.push(block);
    }
  }

  if (treeBlocks.length === 0) {
    throw new Error("No tree blocks found in target file tree section.");
  }

  return treeBlocks;
}

function parseTreeBlocks(blocks) {
  const files = new Set();

  for (const block of blocks) {
    const levels = [];
    const lines = block.split("\n");

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      const trimmed = line.trim();
      if (!trimmed) continue;

      const indent = line.match(/^\s*/)?.[0]?.length ?? 0;
      const depth = Math.floor(indent / 2);
      const isDirectory = trimmed.endsWith("/");
      const rawToken = isDirectory ? trimmed.slice(0, -1) : trimmed;
      const token = rawToken.split(/\s+/)[0];

      const parent = depth === 0 ? "" : levels[depth - 1] ?? "";
      const fullPath = parent ? path.posix.join(parent, token) : token;

      if (isDirectory) {
        levels[depth] = fullPath;
        levels.length = depth + 1;
      } else {
        files.add(fullPath);
      }
    }
  }

  return Array.from(files).sort();
}

async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    const planPath = path.resolve(process.cwd(), args.get("plan") ?? DEFAULT_PLAN_PATH);
    const outputPath = path.resolve(process.cwd(), args.get("out") ?? DEFAULT_OUTPUT_PATH);

    const planContent = await fs.readFile(planPath, "utf8");
    const treeBlocks = extractTargetTree(planContent);
    const files = parseTreeBlocks(treeBlocks);

    const manifest = {
      source: path.relative(process.cwd(), planPath).replace(/\\/g, "/"),
      generated_at: new Date().toISOString(),
      files: files.map((filePath) => ({
        path: filePath,
        regions: [],
        assigned_to: null,
        locked: false,
        last_hash: null,
        last_commit: null,
        status: "planned",
      })),
    };

    await ensureDirectory(outputPath);
    await fs.writeFile(outputPath, JSON.stringify(manifest, null, 2));
    console.log(`Manifest generated for ${files.length} files.`);
  } catch (error) {
    console.error(`[generate_manifest] ${error.message}`);
    process.exitCode = 1;
  }
}

main();
