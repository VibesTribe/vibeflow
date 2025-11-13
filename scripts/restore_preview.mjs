#!/usr/bin/env node
import { execSync } from "child_process";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    const [key, value] = arg.split("=");
    if (key.startsWith("--")) {
      acc[key.slice(2)] = value ?? "true";
    }
    return acc;
  }, {});
}

function safeDiff(fromRef, toRef) {
  try {
    const output = execSync(`git diff --name-only ${fromRef} ${toRef}`, { stdio: ["ignore", "pipe", "pipe"] })
      .toString()
      .trim();
    return output ? output.split("\n").filter(Boolean) : [];
  } catch (error) {
    console.warn("[restore_preview] failed to compute diff", error);
    return [];
  }
}

const args = parseArgs(process.argv.slice(2));
const taskId = args.task ?? args["task-id"] ?? process.env.TASK_ID;

if (!taskId) {
  console.error("[restore_preview] Missing --task or TASK_ID");
  process.exit(1);
}

const sourceRef = args.from ?? args.ref ?? process.env.RESTORE_REF ?? "origin/main";
const targetRef = args.target ?? process.env.RESTORE_TARGET ?? "HEAD";
const restoreBranch = args.branch ?? process.env.RESTORE_BRANCH ?? `restore/${taskId}`;
const previewUrl = args.preview ?? process.env.RESTORE_PREVIEW_URL ?? undefined;
const timestamp = new Date().toISOString();

const files = safeDiff(sourceRef, targetRef);
const metadata = {
  task_id: taskId,
  restore_branch: restoreBranch,
  source_ref: sourceRef,
  created_at: timestamp,
  files,
  preview_url: previewUrl,
};

const outputDir = path.resolve("data/state/restores");
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

const targetFile = path.join(outputDir, `${taskId}.json`);
writeFileSync(targetFile, `${JSON.stringify(metadata, null, 2)}\n`);
console.log(`[restore_preview] wrote ${targetFile}`);
