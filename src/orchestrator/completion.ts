import fs from "fs/promises";
import path from "path";
import { directories, files } from "../config/paths";
import { createBrevoCreditAlertSender } from "../notifications/brevo";
import { publishTaskEvent } from "../telemetry/supabaseWriter";
import { queueTestAssignment } from "./testQueue";
import { recordAssignment } from "./assignmentLedger";
import { requeueTask } from "./dispatcher";
import { readJsonFile } from "../utils/jsonFile";

export type CompletionStatus = "success" | "failed";

export interface CompletionPayload {
  idea_id: string;
  task_id: string;
  slice_id?: string;
  status: CompletionStatus;
  platform: string;
  model: string;
  cost_usd?: number;
  tokens?: {
    prompt?: number;
    completion?: number;
  };
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface CompletionOptions {
  sendCreditAlert?: (details: CreditAlertDetails) => Promise<void> | void;
}

export interface CreditAlertDetails {
  ideaId: string;
  taskId: string;
  platform: string;
  model: string;
  reason?: string;
}

export interface CompletionResult {
  recordedStatus: "completed" | "failed";
  fallbackUsed?: string | null;
}

async function removeQueuedPayload(ideaId: string, taskId: string): Promise<void> {
  const queuePath = path.join(directories.tasksQueue, ideaId, `${taskId}.json`);
  try {
    await fs.unlink(queuePath);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function nextAttempt(taskId: string): Promise<number> {
  const entries = await readJsonFile<any[]>(files.assignmentLog, []);
  return entries.filter((entry) => entry.taskId === taskId).length + 1;
}

function normalizeTokens(tokens?: CompletionPayload["tokens"]): { prompt: number; completion: number } | undefined {
  if (!tokens) {
    return undefined;
  }
  if (tokens.prompt === undefined && tokens.completion === undefined) {
    return undefined;
  }
  return {
    prompt: tokens.prompt ?? 0,
    completion: tokens.completion ?? 0
  };
}

export async function processCompletion(
  payload: CompletionPayload,
  options: CompletionOptions = {}
): Promise<CompletionResult> {
  const ideaId = payload.idea_id;
  const taskId = payload.task_id;
  const recordedStatus = payload.status === "success" ? "completed" : "failed";
  const sendCreditAlert = options.sendCreditAlert ?? createBrevoCreditAlertSender();
  const normalizedTokens = normalizeTokens(payload.tokens);

  const attempt = await nextAttempt(taskId);

  await recordAssignment({
    taskId,
    sliceId: payload.slice_id,
    attempt,
    status: recordedStatus,
    platform: payload.platform,
    model: payload.model,
    costUsd: payload.cost_usd,
    tokens: normalizedTokens,
    notes: payload.reason,
    metadata: {
      idea_id: ideaId,
      reason: payload.reason,
      ...payload.metadata
    }
  });

  await removeQueuedPayload(ideaId, taskId);

  let fallbackUsed: string | null = null;
  if (payload.status !== "success") {
    if (payload.reason === "credits_exhausted") {
      if (sendCreditAlert) {
        try {
          await Promise.resolve(
            sendCreditAlert({
              ideaId,
              taskId,
              platform: payload.platform,
              model: payload.model,
              reason: payload.reason
            })
          );
        } catch (error) {
          console.warn(`[orchestrator] credit alert failed for ${taskId}:`, error);
        }
      }
      const { fallbackUsed: fallback } = await requeueTask(ideaId, taskId, { useFallback: true });
      if (fallback) {
        fallbackUsed = `${payload.platform} -> ${fallback.platform}`;
      } else {
        await requeueTask(ideaId, taskId, { useFallback: false });
      }
    } else {
      await requeueTask(ideaId, taskId, { useFallback: false });
    }
  }

  const originalMetadata =
    payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
      ? { ...(payload.metadata as Record<string, unknown>) }
      : undefined;
  const rawMetadata = originalMetadata ? { ...originalMetadata } : undefined;

  let branchWork: string | undefined;
  let branchTest: string | undefined;
  let branchReview: string | undefined;
  let branchUsed: string | undefined;
  let durationSeconds: number | undefined;

  if (rawMetadata) {
    if (typeof rawMetadata.branch_suggested === 'string') {
      branchWork = rawMetadata.branch_suggested;
      delete rawMetadata.branch_suggested;
    }
    if (typeof rawMetadata.branch_test_suggested === 'string') {
      branchTest = rawMetadata.branch_test_suggested;
      delete rawMetadata.branch_test_suggested;
    }
    if (typeof rawMetadata.branch_review_suggested === 'string') {
      branchReview = rawMetadata.branch_review_suggested;
      delete rawMetadata.branch_review_suggested;
    }
    if (typeof rawMetadata.branch_used === 'string') {
      branchUsed = rawMetadata.branch_used;
      delete rawMetadata.branch_used;
    }
    if (typeof rawMetadata.duration_seconds === 'number') {
      durationSeconds = rawMetadata.duration_seconds;
      delete rawMetadata.duration_seconds;
    } else if ('duration_seconds' in rawMetadata) {
      delete rawMetadata.duration_seconds;
    }
  }

  const cleanedMetadata = rawMetadata && Object.keys(rawMetadata).length ? rawMetadata : undefined;

  if (payload.status === "success") {
    try {
      await queueTestAssignment({
        ideaId,
        sliceId: payload.slice_id,
        taskId,
        attempt,
        platform: payload.platform,
        model: payload.model,
        branch: {
          work: branchWork,
          test: branchTest,
          review: branchReview
        },
        metadata: originalMetadata
      });
    } catch (error) {
      console.warn(`[orchestrator] failed to queue tests for ${taskId}:`, error);
    }
  }

  try {
    await publishTaskEvent({
      ideaId,
      sliceId: payload.slice_id,
      taskId,
      attempt,
      status: recordedStatus,
      platform: payload.platform,
      model: payload.model,
      costActualUsd: payload.cost_usd ?? undefined,
      tokensPrompt: normalizedTokens?.prompt,
      tokensCompletion: normalizedTokens?.completion,
      durationSeconds,
      branch: { work: branchWork, test: branchTest, review: branchReview, used: branchUsed },
      fallbackUsed,
      metadata: cleanedMetadata,
      recordedAt: new Date().toISOString(),
      reason: payload.reason
    });
  } catch (error) {
    console.warn(`[orchestrator] telemetry publish failed for ${taskId}:`, error);
  }

  return { recordedStatus, fallbackUsed };
}
