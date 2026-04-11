#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const QUEUE_DIR = path.resolve(ROOT_DIR, "data/tasks/queued");
const PROCESSED_DIR = path.resolve(ROOT_DIR, "data/tasks/processed");
const FAILED_DIR = path.resolve(ROOT_DIR, "data/tasks/failed");
const TASK_STATE_PATH = path.resolve(ROOT_DIR, "data/state/task.state.json");
const RUNTIME_MODULE = path.resolve(ROOT_DIR, "dist/runtime/createOrchestrator.js");
const PACKET_MODULE = path.resolve(ROOT_DIR, "dist/runtime/normalizeTaskPacket.js");

let runtimePromise = null;
let packetNormalizerPromise = null;

async function main() {
  await Promise.all([ensureDir(QUEUE_DIR), ensureDir(PROCESSED_DIR), ensureDir(FAILED_DIR)]);
  await ensureState();

  const files = (await fs.readdir(QUEUE_DIR)).filter((name) => name.endsWith(".json")).sort();
  if (files.length === 0) {
    console.log("[auto_runner] queue empty");
    return;
  }

  const runtime = await getRuntime();

  for (const fileName of files) {
    const filePath = path.join(QUEUE_DIR, fileName);
    let raw = "";
    try {
      raw = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
      const parsed = JSON.parse(raw);
      const packet = await normalizePacket(parsed);
      if (packet.metadata && typeof packet.metadata === 'object' && packet.metadata.autoDispatch === true) {
        await archivePacket(filePath, fileName, PROCESSED_DIR);
        console.log(`[auto_runner] skipping ${packet.taskId} (autoDispatch)`);
        continue;
      }
      const decision = await runtime.orchestrator.dispatch(packet);
      await archivePacket(filePath, fileName, PROCESSED_DIR);
      console.log(`[auto_runner] dispatched ${packet.taskId} via ${decision.provider}`);
    } catch (error) {
      await moveToFailed(filePath, fileName, error, raw);
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[auto_runner] failed to dispatch ${fileName}: ${message}`);
    }
  }
}

async function getRuntime() {
  if (!runtimePromise) {
    runtimePromise = loadRuntime();
  }
  return runtimePromise;
}

async function loadRuntime() {
  try {
    const module = await import(pathToFileURL(RUNTIME_MODULE).href);
    if (typeof module.createOrchestrator !== "function") {
      throw new Error("createOrchestrator export missing");
    }
    return module.createOrchestrator();
  } catch (error) {
    const hint = error instanceof Error ? error.message : String(error);
    throw new Error(`auto_runner could not load runtime. Run \`npm run build\` first. (${hint})`);
  }
}

async function normalizePacket(raw) {
  const normalizer = await getPacketNormalizer();
  return normalizer(raw);
}

async function getPacketNormalizer() {
  if (!packetNormalizerPromise) {
    packetNormalizerPromise = loadPacketNormalizer();
  }
  return packetNormalizerPromise;
}

async function loadPacketNormalizer() {
  try {
    const module = await import(pathToFileURL(PACKET_MODULE).href);
    if (typeof module.normalizeTaskPacket !== "function") {
      throw new Error("normalizeTaskPacket export missing");
    }
    return module.normalizeTaskPacket;
  } catch (error) {
    const hint = error instanceof Error ? error.message : String(error);
    throw new Error(`auto_runner could not load packet normalizer. Run \`npm run build\` first. (${hint})`);
  }
}

async function archivePacket(filePath, fileName, targetDir) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const destination = path.join(targetDir, fileName.replace(/\.json$/, `-${stamp}.json`));
  await fs.rename(filePath, destination);
}

async function moveToFailed(filePath, fileName, error, raw) {
  const payload = {
    at: new Date().toISOString(),
    file: fileName,
    reason: error instanceof Error ? error.message : String(error),
  };
  try {
    const failedPath = path.join(FAILED_DIR, fileName.replace(/\.json$/, `-failed.json`));
    const packet = safeParse(raw);
    await fs.writeFile(failedPath, JSON.stringify({ packet, error: payload }, null, 2));
    await fs.unlink(filePath);
  } catch (writeError) {
    console.warn("[auto_runner] unable to record failure", writeError);
  }
}

function safeParse(raw) {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureState() {
  try {
    await fs.access(TASK_STATE_PATH);
  } catch {
    const baseline = {
      tasks: [],
      agents: [],
      failures: [],
      merge_candidates: [],
      metrics: {},
      updated_at: new Date().toISOString(),
    };
    await fs.mkdir(path.dirname(TASK_STATE_PATH), { recursive: true });
    await fs.writeFile(TASK_STATE_PATH, JSON.stringify(baseline, null, 2));
  }
}

main().catch((error) => {
  console.error("[auto_runner] fatal", error);
  process.exit(1);
});

