/**
 * vibeflow-meta:
 * id: src/adapters/browserUseRunner.ts
 * task: REBUILD-V5
 * regions:
 *   - id: browser-use-runner
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:browser-use-runner */
import { promises as fs } from "fs";
import path from "path";
import { VisualJob, VisualResult } from "./visualAdapter.template";

const DEFAULT_ENDPOINT = process.env.BROWSER_USE_ENDPOINT ?? "";
const DEFAULT_OUTPUT_ROOT = path.resolve("data/conversations/browser_use");
const GOOGLE_SESSION_PATH = path.resolve("credentials/google_session.enc.json");

export interface BrowserUseOptions {
  endpoint?: string;
  apiKey?: string;
  outputRoot?: string;
  sessionPath?: string;
  fetchImpl?: typeof fetch;
}

interface BrowserUseResponse {
  status?: string;
  screenshot?: string;
  html?: string;
  transcript?: string;
  actions?: Array<{ title?: string; description?: string }>;
  metadata?: Record<string, unknown>;
}

export interface BrowserUseResult extends VisualResult {
  transcriptPath?: string;
  status: "completed" | "dry_run" | "failed";
  metadata?: Record<string, unknown>;
}

export async function executeBrowserUse(
  job: VisualJob,
  options: BrowserUseOptions = {}
): Promise<BrowserUseResult> {
  const endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).trim();
  const fetchImpl = options.fetchImpl ?? fetch;
  const outputRoot = options.outputRoot ?? DEFAULT_OUTPUT_ROOT;

  const sessionPayload = await readSession(options.sessionPath);

  if (!endpoint) {
    return createDryRun(job, outputRoot, "Browser-Use endpoint not configured");
  }

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(options.apiKey
          ? { Authorization: `Bearer ${options.apiKey}` }
          : process.env.BROWSER_USE_API_KEY
          ? { Authorization: `Bearer ${process.env.BROWSER_USE_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        scenario: job.scenario,
        instructions: job.instructions,
        session: sessionPayload,
      }),
    });

    if (!response.ok) {
      throw new Error(`Browser-Use responded with ${response.status}`);
    }

    const payload = (await response.json()) as BrowserUseResponse;
    const targetDir = await prepareOutputDirectory(outputRoot, job.scenario);

    const htmlPath = payload.html
      ? await writeTextFile(targetDir, "page.html", payload.html)
      : undefined;
    const transcriptPath = payload.transcript
      ? await writeTextFile(targetDir, "transcript.md", payload.transcript)
      : undefined;
    const screenshotPath = payload.screenshot
      ? await writeBinaryArtifact(targetDir, "screenshot.png", payload.screenshot)
      : undefined;

    return {
      scenario: job.scenario,
      screenshotPath: screenshotPath ? toRelativePath(screenshotPath) : "",
      htmlPath: htmlPath ? toRelativePath(htmlPath) : "",
      transcriptPath: transcriptPath ? toRelativePath(transcriptPath) : undefined,
      status: payload.status === "failed" ? "failed" : "completed",
      metadata: {
        status: payload.status ?? "completed",
        actions: payload.actions ?? [],
        ...payload.metadata,
      },
    };
  } catch (error) {
    return createDryRun(
      job,
      outputRoot,
      `Browser-Use request failed: ${(error as Error).message}`
    );
  }
}

async function readSession(explicitPath?: string): Promise<string | null> {
  const sessionPath = explicitPath ?? GOOGLE_SESSION_PATH;
  try {
    const content = await fs.readFile(sessionPath, "utf8");
    return content.trim().length > 0 ? content : null;
  } catch {
    return null;
  }
}

async function createDryRun(
  job: VisualJob,
  outputRoot: string,
  reason: string
): Promise<BrowserUseResult> {
  const targetDir = await prepareOutputDirectory(outputRoot, job.scenario);
  await writeTextFile(
    targetDir,
    "instructions.txt",
    `Scenario: ${job.scenario}\n\nInstructions:\n${job.instructions}\n\nReason: ${reason}\n`
  );

  return {
    scenario: job.scenario,
    screenshotPath: "",
    htmlPath: "",
    transcriptPath: undefined,
    status: "dry_run",
    metadata: { reason },
  };
}

async function prepareOutputDirectory(root: string, scenario: string): Promise<string> {
  const safeScenario = scenario
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const targetDir = path.resolve(root, `${safeScenario || "scenario"}-${timestamp}`);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

async function writeTextFile(directory: string, fileName: string, content: string): Promise<string> {
  const filePath = path.resolve(directory, fileName);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

async function writeBinaryArtifact(
  directory: string,
  fileName: string,
  payload: string
): Promise<string> {
  const base64 = extractBase64(payload);
  const buffer = Buffer.from(base64, "base64");
  const filePath = path.resolve(directory, fileName);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

function extractBase64(raw: string): string {
  if (raw.startsWith("data:")) {
    const separator = raw.indexOf(",");
    return separator >= 0 ? raw.slice(separator + 1) : raw;
  }
  return raw;
}

function toRelativePath(target: string): string {
  const relative = path.relative(process.cwd(), target);
  return relative || target;
}
/* @endeditable */
