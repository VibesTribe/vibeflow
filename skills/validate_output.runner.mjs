#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

const REPORT_ROOT = path.resolve("data/conversations/test_runs");

function normalizeViolations(artifact) {
  const violations = [];
  if (!artifact || typeof artifact !== "object") {
    violations.push("Artifact missing or malformed");
    return violations;
  }
  if (artifact.status && artifact.status !== "passed") {
    violations.push(`Artifact status reported as ${artifact.status}`);
  }
  if (Array.isArray(artifact.requirements)) {
    const missing = artifact.requirements.filter((item) => !item.completed);
    missing.forEach((item) => violations.push(`Requirement not satisfied: ${item.title || "unknown"}`));
  }
  if (Array.isArray(artifact.errors)) {
    artifact.errors.forEach((error) => violations.push(String(error)));
  }
  return violations;
}

export async function run(payload) {
  const artifact = payload?.artifact ?? {};
  const violations = normalizeViolations(artifact);
  const status = violations.length === 0 ? "passed" : "failed";

  const reportPath = await writeReport({
    artifact,
    violations,
    status,
  });

  return {
    status,
    violations,
    reportPath,
  };
}

async function writeReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.resolve(REPORT_ROOT, timestamp);
  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.resolve(targetDir, "validate_output.json");
  await fs.writeFile(filePath, JSON.stringify(report, null, 2), "utf8");
  return filePath;
}

async function main() {
  if (process.argv.includes("--probe")) {
    console.log("validate_output ok");
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
