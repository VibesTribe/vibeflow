// src/adapters/assignmentHistory.ts
// Mock-safe: writes JSON files under data/telemetry/assignments if the app has FS access;
// otherwise, upstream callers can swap this module for a DB/Supabase implementation.
import fs from "node:fs/promises";
import path from "node:path";
import { TaskAssignmentEvent, TaskAssignmentHistory } from "../types/telemetry";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "data", "telemetry", "assignments");

async function ensureDir(p: string) {
  try { await fs.mkdir(p, { recursive: true }); } catch {}
}

export async function recordAssignmentEvent(taskId: string, event: TaskAssignmentEvent) {
  await ensureDir(OUT_DIR);
  const file = path.join(OUT_DIR, `${taskId}.json`);
  let current: TaskAssignmentHistory = { task_id: taskId, events: [] };
  try {
    current = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {}
  current.events.push({ ...event, timestamp: new Date().toISOString() });
  await fs.writeFile(file, JSON.stringify(current, null, 2), "utf8");
  return current;
}

export async function readAssignmentHistory(taskId: string): Promise<TaskAssignmentHistory | null> {
  const file = path.join(OUT_DIR, `${taskId}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch { return null; }
}

export async function listAssignmentHistories(): Promise<TaskAssignmentHistory[]> {
  await ensureDir(OUT_DIR);
  let files: string[] = [];
  try { files = await fs.readdir(OUT_DIR); } catch { return []; }
  const out: TaskAssignmentHistory[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    try {
      out.push(JSON.parse(await fs.readFile(path.join(OUT_DIR, f), "utf8")));
    } catch {}
  }
  return out;
}
