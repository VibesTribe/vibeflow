#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import process from "process";

const DEFAULT_PLAN_PATH = "docs/system_plan_v5.md";
const DEFAULT_OUTPUT_PATH = "docs/keep_delete_v5.md";
const SPECIAL_DIRS = ["node_modules", "dist", ".snapshots"];
const SCAN_EXCLUDE = new Set([".git", "node_modules", ".pnpm-store", ".cache", ".idea"]);
const DEFAULT_PROTECTED = new Set([
  "docs/keep_delete_v5.md",
  "data/digest/latest.md",
  "data/digest/weekly.md",
  "scripts/compute_keep_delete.mjs",
]);

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

async function walk(dir) {
  const output = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (SCAN_EXCLUDE.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      output.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      output.push(fullPath.replace(/\\/g, "/"));
    }
  }
  return output;
}

async function main() {
  try {
    const args = parseArgs(process.argv);
    const planPath = path.resolve(process.cwd(), args.get("target-tree") ?? args.get("plan") ?? DEFAULT_PLAN_PATH);
    const outputPath = path.resolve(process.cwd(), args.get("out") ?? DEFAULT_OUTPUT_PATH);

    const planContent = await fs.readFile(planPath, "utf8");
    const treeBlocks = extractTargetTree(planContent);
    const expectedFiles = parseTreeBlocks(treeBlocks);
    const expectedSet = new Set(expectedFiles);

    const existingFiles = (await walk(process.cwd())).map((filePath) => {
      return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
    });

    const keep = new Set();
    const deleteSet = new Set();

    for (const filePath of existingFiles) {
      if (expectedSet.has(filePath) || DEFAULT_PROTECTED.has(filePath)) {
        keep.add(filePath);
      } else {
        deleteSet.add(filePath);
      }
    }

    for (const dirName of SPECIAL_DIRS) {
      const dirPath = path.join(process.cwd(), dirName);
      try {
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          const normalized = dirName.endsWith("/") ? dirName : `${dirName}/`;
          if (!expectedSet.has(normalized)) {
            deleteSet.add(normalized);
          }
        }
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }

    const create = expectedFiles.filter((filePath) => !keep.has(filePath) && !existingFiles.includes(filePath));

    const toSortedArray = (set) => Array.from(set).sort();
    const keepArr = toSortedArray(keep);
    const deleteArr = toSortedArray(deleteSet);
    const createArr = Array.from(new Set(create)).sort();

    const lines = [
      "KEEP:",
      ...keepArr.map((item) => `  ${item}`),
      "",
      "DELETE:",
      ...deleteArr.map((item) => `  ${item}`),
      "",
      "CREATE:",
      ...createArr.map((item) => `  ${item}`),
      "",
      `# Generated at ${new Date().toISOString()}`,
      `# Source plan: ${path.relative(process.cwd(), planPath).replace(/\\/g, "/")}`,
    ];

    await fs.writeFile(outputPath, lines.join("\n"));
    console.log(`Keep/Delete list written to ${path.relative(process.cwd(), outputPath)}`);
  } catch (error) {
    console.error(`[compute_keep_delete] ${error.message}`);
    process.exitCode = 1;
  }
}

main();

