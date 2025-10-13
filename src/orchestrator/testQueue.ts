import fs from "fs/promises";
import path from "path";
import { directories } from "../config/paths";
import { recordAssignment } from "./assignmentLedger";
import { writeJsonFile } from "../utils/jsonFile";

interface ValidationSpec {
  name: string;
  tool: string;
  [key: string]: unknown;
}

interface TaskPacket {
  validation?: ValidationSpec[];
  acceptance_criteria?: string[];
  deliverables?: string[];
  title?: string;
}

interface QueueTestAssignmentOptions {
  ideaId: string;
  sliceId?: string;
  taskId: string;
  attempt: number;
  platform: string;
  model: string;
  branch: {
    work?: string;
    test?: string;
    review?: string;
  };
  metadata?: Record<string, unknown>;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function buildTestFileName(taskId: string, attempt: number, testAttempt: number): string {
  return `${taskId}.attempt-${pad(attempt)}.test-${pad(testAttempt)}.json`;
}

async function loadTaskPacket(ideaId: string, sliceId: string | undefined, taskId: string): Promise<TaskPacket | null> {
  const base = path.join(directories.root, "data", "taskpackets", ideaId);
  const packetPath = sliceId
    ? path.join(base, sliceId, `${taskId}.json`)
    : path.join(base, `${taskId}.json`);
  try {
    const raw = await fs.readFile(packetPath, "utf8");
    return JSON.parse(raw) as TaskPacket;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function buildInstructions(validations: ValidationSpec[], branch: string | undefined): string[] {
  const steps: string[] = [];
  if (branch) {
    steps.push(`Checkout or create the test branch ${branch} based on the latest work branch.`);
  }
  validations.forEach((validation, index) => {
    const label = validation.name ?? `validation-${index + 1}`;
    const tool = validation.tool ?? "(specify command)";
    steps.push(`Run ${tool} for ${label} and capture pass/fail evidence.`);
  });
  steps.push("Summarize results and attach logs in the completion response.");
  return steps;
}

export async function queueTestAssignment(options: QueueTestAssignmentOptions): Promise<boolean> {
  const packet = await loadTaskPacket(options.ideaId, options.sliceId, options.taskId);
  const validations = packet?.validation?.filter((entry) => typeof entry?.tool === "string") ?? [];
  if (!validations.length) {
    return false;
  }

  const testAttempt = 1;
  const filename = buildTestFileName(options.taskId, options.attempt, testAttempt);
  const queueDir = path.join(directories.testQueue, options.ideaId);
  await fs.mkdir(queueDir, { recursive: true });
  const queuePath = path.join(queueDir, filename);

  try {
    await fs.access(queuePath);
    // Assignment already queued for this attempt.
    return false;
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const branchTest = options.branch.test ?? `test/${options.ideaId}/${options.sliceId ?? "_"}/${options.taskId}/attempt-${pad(options.attempt)}`;
  const branchWork = options.branch.work ?? `agent/${options.ideaId}/${options.sliceId ?? "_"}/${options.taskId}/attempt-${pad(options.attempt)}`;
  const branchReview = options.branch.review ?? `review/${options.ideaId}/${options.sliceId ?? "_"}/${options.taskId}`;

  const assignment = {
    idea_id: options.ideaId,
    slice_id: options.sliceId ?? null,
    task_id: options.taskId,
    source_attempt: options.attempt,
    test_attempt: testAttempt,
    assignment_type: "test",
    platform: "cli",
    model: options.model,
    branch: {
      work: branchWork,
      test: branchTest,
      review: branchReview
    },
    validations,
    acceptance_criteria: packet?.acceptance_criteria ?? [],
    deliverables: packet?.deliverables ?? [],
    instructions: buildInstructions(validations, branchTest),
    notes: [`Source task attempt ${options.attempt} completed successfully; run validations before supervisor review.`],
    metadata: {
      ...options.metadata,
      task_title: packet?.title ?? null
    }
  };

  await writeJsonFile(queuePath, assignment);
  await recordAssignment({
    taskId: `${options.taskId}#test`,
    sliceId: options.sliceId,
    attempt: testAttempt,
    status: "assigned",
    platform: "cli",
    model: options.model,
    metadata: {
      idea_id: options.ideaId,
      source_attempt: options.attempt,
      assignment_type: "test",
      queue_path: path.relative(directories.root, queuePath)
    }
  });

  return true;
}

export function nextTestFileName(taskId: string, attempt: number, testAttempt: number): string {
  return buildTestFileName(taskId, attempt, testAttempt);
}
