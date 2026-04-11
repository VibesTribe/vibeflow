#!/usr/bin/env node
import { promises as fs } from "fs";
import path from "path";

const DEFAULT_ENDPOINT = process.env.BROWSER_USE_ENDPOINT ?? "";
const OUTPUT_ROOT = path.resolve("data/conversations/browser_use");
const SESSION_PATH = path.resolve("credentials/google_session.enc.json");

async function run(payload) {
  const scenarios = Array.isArray(payload?.scenarios) ? payload.scenarios : [payload];
  const results = [];
  for (const entry of scenarios) {
    if (!entry || !entry.scenario || !entry.instructions) {
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const result = await executeScenario(entry);
    results.push(result);
  }
  return {
    status: results.every((r) => r.status === "completed") ? "completed" : "partial",
    results,
  };
}

async function executeScenario(job) {
  const endpoint = (process.env.BROWSER_USE_ENDPOINT ?? DEFAULT_ENDPOINT).trim();
  const session = await readSession();

  if (!endpoint) {
    return createDryRun(job, "Browser-Use endpoint not configured");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.BROWSER_USE_API_KEY
          ? { Authorization: `Bearer ${process.env.BROWSER_USE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        scenario: job.scenario,
        instructions: job.instructions,
        session,
      }),
    });

    if (!response.ok) {
      throw new Error(`Browser-Use responded with ${response.status}`);
    }

    const payload = await response.json();
    const targetDir = await prepareOutputDirectory(job.scenario);

    const htmlPath = payload.html
      ? await writeTextFile(targetDir, "page.html", payload.html)
      : null;
    const transcriptPath = payload.transcript
      ? await writeTextFile(targetDir, "transcript.md", payload.transcript)
      : null;
    const screenshotPath = payload.screenshot
      ? await writeBinaryArtifact(targetDir, "screenshot.png", payload.screenshot)
      : null;

    return {
      scenario: job.scenario,
      status: payload.status === "failed" ? "failed" : "completed",
      htmlPath,
      screenshotPath,
      transcriptPath,
      metadata: payload.metadata ?? {},
    };
  } catch (error) {
    return createDryRun(job, `Browser-Use request failed: ${(error).message}`);
  }
}

async function readSession() {
  try {
    const content = await fs.readFile(SESSION_PATH, "utf8");
    return content.trim() || null;
  } catch {
    return null;
  }
}

async function createDryRun(job, reason) {
  const targetDir = await prepareOutputDirectory(job.scenario);
  await writeTextFile(
    targetDir,
    "instructions.txt",
    `Scenario: ${job.scenario}\n\nInstructions:\n${job.instructions}\n\nReason: ${reason}\n`
  );

  return {
    scenario: job.scenario,
    status: "dry_run",
    htmlPath: null,
    screenshotPath: null,
    transcriptPath: null,
    metadata: { reason },
  };
}

async function prepareOutputDirectory(scenario) {
  const safeScenario = String(scenario)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.resolve(OUTPUT_ROOT, `${safeScenario || "scenario"}-${timestamp}`);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

async function writeTextFile(directory, fileName, content) {
  const filePath = path.resolve(directory, fileName);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

async function writeBinaryArtifact(directory, fileName, payload) {
  const base64 = extractBase64(payload);
  const buffer = Buffer.from(base64, "base64");
  const filePath = path.resolve(directory, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

function extractBase64(raw) {
  if (typeof raw !== "string") {
    return "";
  }
  if (raw.startsWith("data:")) {
    const separator = raw.indexOf(",");
    return separator >= 0 ? raw.slice(separator + 1) : raw;
  }
  return raw;
}

async function main() {
  if (process.argv.includes("--probe")) {
    console.log("visual_execution ok");
    return;
  }

  const data = await new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

  const payload = data ? JSON.parse(data) : {};
  const result = await run(payload);
  process.stdout.write(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
