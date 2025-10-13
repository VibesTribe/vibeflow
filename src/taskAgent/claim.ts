import type { Stats } from "fs";
import fs from "fs/promises";
import path from "path";
import { directories, files } from "../config/paths";
import { readJsonFile, writeJsonFile } from "../utils/jsonFile";
import type { AssignmentPayload, BranchGuidance, InProgressRecord } from "./types";

export interface ClaimOptions {
  ideaId?: string;
  taskId?: string;
  dryRun?: boolean;
  branchPrefix?: string;
}

export interface ClaimResult {
  record: InProgressRecord;
  queuePath: string;
  inProgressPath: string;
  dryRun: boolean;
}

interface QueuedEntry {
  queuePath: string;
  payload: AssignmentPayload;
  stats: Stats;
}

function padAttempt(attempt: number): string {
  return attempt.toString().padStart(2, "0");
}

function buildBranchGuidance(
  payload: AssignmentPayload,
  attempt: number,
  prefix?: string
): {
  work: BranchGuidance;
  test: BranchGuidance;
  review: BranchGuidance;
} {
  const attemptLabel = padAttempt(attempt);
  const basePrefix = prefix ?? "agent";
  const workBranch = `${basePrefix}/${payload.idea_id}/${payload.slice_id}/${payload.task_id}/attempt-${attemptLabel}`;
  const testBranch = `test/${payload.idea_id}/${payload.slice_id}/${payload.task_id}/attempt-${attemptLabel}`;
  const reviewBranch = `review/${payload.idea_id}/${payload.slice_id}/${payload.task_id}`;

  return {
    work: {
      suggested: workBranch,
      base: "codex",
      stage: "task_agent",
      description: "Implementation branch for task agent execution before hand-off to testing."
    },
    test: {
      suggested: testBranch,
      base: workBranch,
      stage: "test_agent",
      description: "Validation branch where test agents run automated checks before supervisor review."
    },
    review: {
      suggested: reviewBranch,
      base: testBranch,
      stage: "supervisor_review",
      description: "Supervisor review branch promoted after validation success."
    }
  };
}

async function computeAttempt(taskId: string): Promise<number> {
  const entries = await readJsonFile<any[]>(files.assignmentLog, []);
  return entries.filter((entry) => entry.taskId === taskId).length + 1;
}

async function collectQueuedEntries(ideaId?: string): Promise<QueuedEntry[]> {
  const baseDir = directories.tasksQueue;
  const entries: QueuedEntry[] = [];

  async function visitIdeaDir(dir: string) {
    let filesInDir: string[];
    try {
      filesInDir = await fs.readdir(dir);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const file of filesInDir) {
      if (!file.endsWith(".json")) continue;
      const queuePath = path.join(dir, file);
      const raw = await fs.readFile(queuePath, "utf8");
      const payload = JSON.parse(raw) as AssignmentPayload;
      const stats = await fs.stat(queuePath);
      entries.push({ queuePath, payload, stats });
    }
  }

  if (ideaId) {
    await visitIdeaDir(path.join(baseDir, ideaId));
  } else {
    let ideaDirs: string[];
    try {
      ideaDirs = await fs.readdir(baseDir);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
    for (const idea of ideaDirs) {
      const target = path.join(baseDir, idea);
      const stat = await fs.stat(target);
      if (!stat.isDirectory()) continue;
      await visitIdeaDir(target);
    }
  }

  return entries;
}

function filterEntries(entries: QueuedEntry[], taskId?: string): QueuedEntry[] {
  if (!taskId) return entries;
  return entries.filter((entry) => entry.payload.task_id === taskId);
}

export async function claimAssignment(options: ClaimOptions = {}): Promise<ClaimResult | null> {
  const entries = filterEntries(await collectQueuedEntries(options.ideaId), options.taskId);
  if (!entries.length) {
    return null;
  }

  entries.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
  const target = entries[0];
  const { payload, queuePath } = target;
  const attempt = await computeAttempt(payload.task_id);
  const branch = buildBranchGuidance(payload, attempt, options.branchPrefix);
  const inProgressPath = path.join(directories.tasksInProgress, payload.idea_id, `${payload.task_id}.json`);

  try {
    await fs.access(inProgressPath);
    throw new Error(`Task ${payload.task_id} for idea ${payload.idea_id} is already claimed.`);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const record: InProgressRecord = {
    idea_id: payload.idea_id,
    slice_id: payload.slice_id,
    task_id: payload.task_id,
    assignment_type: payload.assignment_type,
    platform: payload.platform,
    model: payload.model,
    attempt,
    claimed_at: new Date().toISOString(),
    branch,
    payload,
    metadata: {
      queue_path: path.relative(directories.tasksQueue, queuePath)
    }
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

export async function listQueuedAssignments(ideaId?: string): Promise<InProgressRecord[]> {
  const entries = await collectQueuedEntries(ideaId);
  entries.sort((a, b) => a.stats.mtimeMs - b.stats.mtimeMs);
  const results: InProgressRecord[] = [];
  for (const entry of entries) {
    const attempt = await computeAttempt(entry.payload.task_id);
    const branch = buildBranchGuidance(entry.payload, attempt);
    results.push({
      idea_id: entry.payload.idea_id,
      slice_id: entry.payload.slice_id,
      task_id: entry.payload.task_id,
      assignment_type: entry.payload.assignment_type,
      platform: entry.payload.platform,
      model: entry.payload.model,
      attempt,
      claimed_at: "",
      branch,
      payload: entry.payload
    });
  }
  return results;
}
