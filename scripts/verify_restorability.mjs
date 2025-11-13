#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";

const reviewDir = path.resolve("data/state/reviews");
const restoreDir = path.resolve("data/state/restores");

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    console.warn(`[verify_restorability] skipped invalid JSON: ${filePath}`, error);
    return null;
  }
}

const reviewFiles = existsSync(reviewDir) ? readdirSync(reviewDir).filter((file) => file.endsWith(".json")) : [];
const restoreFiles = existsSync(restoreDir) ? readdirSync(restoreDir).filter((file) => file.endsWith(".json")) : [];

const restoreMap = new Map(
  restoreFiles.map((file) => {
    const absolutePath = path.join(restoreDir, file);
    const record = readJsonSafe(absolutePath) ?? {};
    const taskId = record.task_id ?? path.basename(file, ".json");
    return [taskId, { ...record, file: absolutePath }];
  }),
);

const violations = [];

reviewFiles.forEach((file) => {
  const absolutePath = path.join(reviewDir, file);
  const review = readJsonSafe(absolutePath);
  if (!review?.task_id) {
    return;
  }
  const status = String(review.review ?? "pending").toLowerCase();
  if (status !== "pending" && status !== "changes_requested") {
    return;
  }

  const restore = restoreMap.get(review.task_id);
  if (!restore) {
    violations.push(`Missing restore record for ${review.task_id} (review file: ${file})`);
    return;
  }
  if (!restore.restore_branch || !restore.source_ref) {
    violations.push(`Restore record for ${review.task_id} is incomplete (${restore.file})`);
  }
});

if (violations.length > 0) {
  console.error("[verify_restorability] Found issues:\n- " + violations.join("\n- "));
  process.exit(1);
}

console.log("[verify_restorability] All pending review diffs have restore metadata.");
