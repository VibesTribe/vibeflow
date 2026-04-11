#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

const REPORT_ROOT = path.resolve("data/conversations/test_runs");

function normalizeResult(payload) {
  const scenario = payload?.scenario ?? "default";
  const diffs = Array.isArray(payload?.diffs) ? payload.diffs : [];
  const failures = diffs.filter((diff) => diff.status === "diff");
  return {
    scenario,
    status: failures.length > 0 ? "failed" : "completed",
    diffs,
  };
}

export async function run(payload) {
  const result = normalizeResult(payload);
  const reportPath = await writeReport(result);
  return {
    status: result.status,
    reportPath,
    scenario: result.scenario,
    diffs: result.diffs,
  };
}

async function writeReport(result) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.resolve(REPORT_ROOT, `${result.scenario}-${timestamp}`);
  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.resolve(targetDir, "visual_tests.json");
  await fs.writeFile(filePath, JSON.stringify(result, null, 2), "utf8");
  return filePath;
}

async function main() {
  if (process.argv.includes("--probe")) {
    console.log("run_visual_tests ok");
    return;
  }
  const payload = await readPayload();
  const result = await run(payload);
  process.stdout.write(JSON.stringify(result));
}

async function readPayload() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
