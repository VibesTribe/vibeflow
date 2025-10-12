import type { Stats } from "fs";
import fs from "fs/promises";
import path from "path";
import { directories } from "../config/paths";
import { writeJsonFile, readJsonFile } from "../utils/jsonFile";
import type { InProgressTestRecord, TestAssignmentPayload } from "./types";

export interface ClaimTestOptions {
  ideaId?: string;
  taskId?: string;
  dryRun?: boolean;
}

export interface ClaimTestResult {
  record: InProgressTestRecord;
  queuePath: string;
  inProgressPath: string;
  dryRun: boolean;
}

interface QueuedTestEntry {
  queuePath: string;
  payload: TestAssignmentPayload;
  stats: Stats;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildInProgressPath(payload: TestAssignmentPayload): string {
  const filename = `${payload.task_id}.attempt-${pad(payload.source_attempt)}.test-${pad(payload.test_attempt)}.json`;
  return path.join(directories.testInProgress, payload.idea_id, filename);
}

async function collectQueued(ideaId?: string): Promise<QueuedTestEntry[]> {
  const baseDir = directories.testQueue;
  const entries: QueuedTestEntry[] = [];

  async function visitDir(target: string) {
    let items: string[];
    try {
      items = await fs.readdir(target);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const file of items) {
      if (!file.endsWith('.json')) continue;
      const queuePath = path.join(target, file);
      const raw = await fs.readFile(queuePath, 'utf8');
      const payload = JSON.parse(raw) as TestAssignmentPayload;
      const stats = await fs.stat(queuePath);
      entries.push({ queuePath, payload, stats });
    }
  }

  if (ideaId) {
    await visitDir(path.join(baseDir, ideaId));
  } else {
    let ideas: string[];
    try {
      ideas = await fs.readdir(baseDir);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
    for (const dir of ideas) {
      const full = path.join(baseDir, dir);
      const stat = await fs.stat(full);
      if (!stat.isDirectory()) continue;
      await visitDir(full);
    }
  }

  return entries;
}

function filterEntries(entries: QueuedTestEntry[], taskId?: string): QueuedTestEntry[] {
  if (!taskId) return entries;
  return entries.filter((entry) => entry.payload.task_id === taskId);
}

export async function claimTestAssignment(options: ClaimTestOptions = {}): Promise<ClaimTestResult | null> {
  const entries = filterEntries(await collectQueued(options.ideaId), options.taskId);
  if (!entries.length) {
    return null;
  }

  entries.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
  const target = entries[0];
  const { queuePath, payload } = target;
  const inProgressPath = buildInProgressPath(payload);

  try {
    await fs.access(inProgressPath);
    throw new Error(`Test assignment for ${payload.task_id} attempt ${payload.source_attempt} is already claimed.`);
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const record: InProgressTestRecord = {
    ...payload,
    claimed_at: new Date().toISOString(),
    queue_path: path.relative(directories.root, queuePath)
  };

  if (options.dryRun) {
    return {
      record,
      queuePath,
      inProgressPath,
      dryRun: true
    };
  }

  await fs.mkdir(path.dirname(inProgressPath), { recursive: true });
  await writeJsonFile(inProgressPath, record);
  await fs.unlink(queuePath);

  return {
    record,
    queuePath,
    inProgressPath,
    dryRun: false
  };
}

export async function loadInProgressTestRecord(ideaId: string, taskId: string, attempt: number, testAttempt: number): Promise<InProgressTestRecord | null> {
  const filename = `${taskId}.attempt-${pad(attempt)}.test-${pad(testAttempt)}.json`;
  const target = path.join(directories.testInProgress, ideaId, filename);
  try {
    return await readJsonFile<InProgressTestRecord>(target, null as any);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function listQueuedTestAssignments(ideaId?: string): Promise<TestAssignmentPayload[]> {
  const entries = await collectQueued(ideaId);
  entries.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
  return entries.map((entry) => entry.payload);
}
