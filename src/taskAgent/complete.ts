import fs from "fs/promises";
import path from "path";
import { directories } from "../config/paths";
import { readJsonFile } from "../utils/jsonFile";
import { processCompletion, type CompletionPayload, type CompletionResult, type CompletionStatus } from "../orchestrator/completion";
import type { InProgressRecord } from "./types";

export interface CompletionTokensInput {
  prompt?: number;
  completion?: number;
}

export interface CompleteAssignmentInput {
  ideaId: string;
  taskId: string;
  status: CompletionStatus;
  costUsd?: number;
  tokens?: CompletionTokensInput;
  reason?: string;
  metadata?: Record<string, unknown>;
  branchUsed?: string;
  dryRun?: boolean;
}

export interface CompleteAssignmentResult {
  payload: CompletionPayload;
  result?: CompletionResult;
  dryRun: boolean;
}

function resolveInProgressPath(ideaId: string, taskId: string): string {
  return path.join(directories.tasksInProgress, ideaId, `${taskId}.json`);
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return Object.keys(cleaned).length ? cleaned : undefined;
}

export async function loadInProgressRecord(ideaId: string, taskId: string): Promise<InProgressRecord | null> {
  const inProgressPath = resolveInProgressPath(ideaId, taskId);
  try {
    return await readJsonFile<InProgressRecord | null>(inProgressPath, null);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function completeAssignment(input: CompleteAssignmentInput): Promise<CompleteAssignmentResult> {
  const inProgressPath = resolveInProgressPath(input.ideaId, input.taskId);
  const record = await loadInProgressRecord(input.ideaId, input.taskId);
  if (!record) {
    throw new Error(`Task ${input.taskId} for idea ${input.ideaId} is not claimed.`);
  }

  const tokens = input.tokens ?? {};
  const hasTokens = tokens.prompt !== undefined || tokens.completion !== undefined;
  const metadata: Record<string, unknown> = {
    attempt: record.attempt,
    branch_suggested: record.branch?.work?.suggested,
    branch_test_suggested: record.branch?.test?.suggested,
    branch_review_suggested: record.branch?.review?.suggested,
    branch_used: input.branchUsed,
    claimed_at: record.claimed_at
  };

  const claimedAt = Date.parse(record.claimed_at);
  if (!Number.isNaN(claimedAt)) {
    const durationSeconds = Math.max(0, Math.round((Date.now() - claimedAt) / 1000));
    metadata.duration_seconds = durationSeconds;
  }

  if (input.metadata) {
    Object.assign(metadata, input.metadata);
  }

  const payload: CompletionPayload = {
    idea_id: record.idea_id,
    task_id: record.task_id,
    slice_id: record.slice_id,
    status: input.status,
    platform: record.platform,
    model: record.model,
    cost_usd: input.costUsd,
    tokens: hasTokens ? tokens : undefined,
    reason: input.reason,
    metadata: sanitizeMetadata(metadata)
  };

  if (input.dryRun) {
    return { payload, dryRun: true };
  }

  const result = await processCompletion(payload);
  await fs.unlink(inProgressPath).catch((error: any) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });

  return {
    payload,
    result,
    dryRun: false
  };
}
