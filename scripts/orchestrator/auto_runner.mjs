#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const QUEUE_DIR = path.resolve("data/tasks/queued");
const PROCESSED_DIR = path.resolve("data/tasks/processed");
const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");
const TASK_STATE_PATH = path.resolve("data/state/task.state.json");

async function main() {
  await fs.mkdir(QUEUE_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });
  await ensureFile(EVENTS_PATH, "");
  await ensureState();

  const entries = await fs.readdir(QUEUE_DIR);
  const taskFiles = entries.filter((name) => name.endsWith(".json"));
  if (taskFiles.length === 0) {
    console.log("[auto_runner] queue empty");
    return;
  }

  for (const fileName of taskFiles) {
    const filePath = path.join(QUEUE_DIR, fileName);
    try {
      const raw = (await fs.readFile(filePath, "utf8")).replace(/^\uFEFF/, "");
      const packet = JSON.parse(raw);
      await processTaskPacket(packet);
      const destination = path.join(PROCESSED_DIR, fileName);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      await fs.rename(filePath, destination.replace(/\.json$/, `-${stamp}.json`));
      console.log(`[auto_runner] processed ${packet.taskId ?? fileName}`);
    } catch (error) {
      console.error(`[auto_runner] failed to process ${fileName}:`, error);
    }
  }
}

async function processTaskPacket(packet) {
  if (!packet || typeof packet !== "object") {
    throw new Error("Task packet missing");
  }
  if (!packet.taskId || !packet.title) {
    throw new Error("Task packet must include taskId and title");
  }

  const timestamp = new Date().toISOString();
  const provider = packet.provider ?? packet.assignedProvider ?? "unassigned";
  const confidence = typeof packet.confidence === "number" ? packet.confidence : 1;

  await appendEvent({
    id: `event-${Date.now()}`,
    task_id: packet.taskId,
    type: "status_change",
    timestamp,
    details: {
      to: "assigned",
      provider,
      confidence,
      title: packet.title,
    },
  });

  const state = JSON.parse(await fs.readFile(TASK_STATE_PATH, "utf8"));
  const updatedTask = {
    id: packet.taskId,
    title: packet.title,
    status: "assigned",
    confidence,
    owner: provider,
    lessons: [],
    updated_at: timestamp,
    updatedAt: timestamp,
  };
  state.tasks = Array.isArray(state.tasks)
    ? state.tasks.filter((task) => task.id !== packet.taskId).concat(updatedTask)
    : [updatedTask];
  state.updated_at = timestamp;
  await fs.writeFile(TASK_STATE_PATH, JSON.stringify(state, null, 2));
}

async function appendEvent(event) {
  const line = `${JSON.stringify(event)}\n`;
  await fs.appendFile(EVENTS_PATH, line, "utf8");
}

async function ensureFile(filePath, contents) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, contents, "utf8");
  }
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
