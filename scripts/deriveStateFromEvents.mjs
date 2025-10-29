#!/usr/bin/env node

import { promises as fs } from "fs";
import path from "path";

const EVENTS_PATH = path.resolve("data/state/events.log.jsonl");
const OUTPUT_PATH = path.resolve("data/state/task.state.json");

async function loadEvents() {
  const content = await fs.readFile(EVENTS_PATH, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function reduce(events) {
  const tasks = new Map();
  const failures = [];

  for (const event of events) {
    const record = tasks.get(event.task_id) ?? {
      id: event.task_id,
      title: event.details?.title ?? event.task_id,
      status: "assigned",
      confidence: 1,
      updated_at: event.timestamp,
      owner: event.details?.owner ?? null,
      lessons: [],
    };

    if (event.type === "status_change" && event.details?.to) {
      record.status = event.details.to;
      record.updated_at = event.timestamp;
    }

    if (event.type === "note" && event.details?.lesson) {
      record.lessons.push(event.details.lesson);
    }

    if (event.type === "failure") {
      failures.push({
        id: event.id,
        title: event.details?.title ?? "Unknown failure",
        summary: event.details?.summary ?? "",
        reason_code: event.reason_code ?? "E/UNKNOWN",
      });
    }

    tasks.set(event.task_id, record);
  }

  return {
    tasks: Array.from(tasks.values()),
    failures,
  };
}

async function main() {
  try {
    const events = await loadEvents();
    const snapshot = reduce(events);
    const existing = JSON.parse(await fs.readFile(OUTPUT_PATH, "utf8"));
    const merged = {
      ...existing,
      tasks: snapshot.tasks,
      failures: snapshot.failures,
      updated_at: new Date().toISOString(),
    };
    await fs.writeFile(OUTPUT_PATH, JSON.stringify(merged, null, 2));
    console.log("[deriveStateFromEvents] state refreshed");
  } catch (error) {
    console.error(`[deriveStateFromEvents] ${error.message}`);
    process.exit(1);
  }
}

main();
