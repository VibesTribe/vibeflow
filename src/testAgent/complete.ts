import fs from "fs/promises";
import path from "path";
import { directories } from "../config/paths";
import { recordAssignment } from "../orchestrator/assignmentLedger";
import { writeJsonFile, readJsonFile } from "../utils/jsonFile";
import type { InProgressTestRecord, TestAssignmentPayload } from "./types";

export interface CompleteTestAssignmentInput {
  ideaId: string;
  taskId: string;
  attempt: number;
  testAttempt: number;
  status: "success" | "failed";
  notes?: string;
  dryRun?: boolean;
}

export interface CompleteTestAssignmentResult {
  payload: InProgressTestRecord;
  dryRun: boolean;
  requeued?: boolean;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function inProgressPath(ideaId: string, taskId: string, attempt: number, testAttempt: number): string {
  const filename = `${taskId}.attempt-${pad(attempt)}.test-${pad(testAttempt)}.json`;
  return path.join(directories.testInProgress, ideaId, filename);
}

function queuePathFor(payload: TestAssignmentPayload): string {
  const filename = `${payload.task_id}.attempt-${pad(payload.source_attempt)}.test-${pad(payload.test_attempt)}.json`;
  return path.join(directories.testQueue, payload.idea_id, filename);
}

export async function completeTestAssignment(input: CompleteTestAssignmentInput): Promise<CompleteTestAssignmentResult> {
  const targetPath = inProgressPath(input.ideaId, input.taskId, input.attempt, input.testAttempt);
  let record: InProgressTestRecord;
  try {
    record = await readJsonFile<InProgressTestRecord>(targetPath, null as any);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`No in-progress test assignment found for ${input.ideaId}/${input.taskId} attempt ${input.attempt} test ${input.testAttempt}.`);
    }
    throw error;
  }

  if (input.dryRun) {
    return { payload: record, dryRun: true };
  }

  await fs.unlink(targetPath).catch((error: any) => {
    if (error.code !== "ENOENT") {
      throw error;
    }
  });

  await recordAssignment({
    taskId: `${record.task_id}#test`,
    sliceId: record.slice_id ?? undefined,
    attempt: record.test_attempt,
    status: input.status === "success" ? "completed" : "failed",
    platform: record.platform,
    model: record.model ?? "",
    notes: input.notes,
    metadata: {
      idea_id: record.idea_id,
      source_attempt: record.source_attempt,
      assignment_type: "test"
    }
  });

  let requeued = false;
  if (input.status === "failed") {
    const nextPayload: TestAssignmentPayload = {
      idea_id: record.idea_id,
      slice_id: record.slice_id ?? null,
      task_id: record.task_id,
      source_attempt: record.source_attempt,
      test_attempt: record.test_attempt + 1,
      assignment_type: record.assignment_type,
      platform: record.platform,
      model: record.model,
      branch: record.branch,
      validations: record.validations,
      acceptance_criteria: record.acceptance_criteria,
      deliverables: record.deliverables,
      instructions: record.instructions,
      notes: record.notes,
      metadata: record.metadata
    };
    const queuePath = queuePathFor(nextPayload);
    await fs.mkdir(path.dirname(queuePath), { recursive: true });
    await writeJsonFile(queuePath, nextPayload);
    requeued = true;
  }

  return {
    payload: record,
    dryRun: false,
    requeued
  };
}
