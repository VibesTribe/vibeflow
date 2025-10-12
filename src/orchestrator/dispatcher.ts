import fs from "fs/promises";
import path from "path";
import { directories, files } from "../config/paths";
import type { RateLimitEvaluation } from "../telemetry/rateLimiter";
import { isPlatformAllowed } from "../telemetry/rateLimiter";
import { getModelDefinition } from "../config/registry";
import { recordAssignment } from "./assignmentLedger";
import { loadOrchestratorContext } from "./runtime";
import { readJsonFile, writeJsonFile } from "../utils/jsonFile";
import type { TaskPacket } from "../planner/types";

interface FallbackTarget {
  platform: string;
  model: string;
}

const PLATFORM_FALLBACKS: Record<string, FallbackTarget[]> = {
  "vscode-codex": [
    { platform: "codex:cli", model: "codex:cli" },
    { platform: "roo:cli", model: "roo:cli" },
    { platform: "kilo:cli", model: "kilo:cli" },
    { platform: "openrouter:deepseek-r1", model: "openrouter:deepseek-r1" },
    { platform: "openrouter:gemini-flash-1.5", model: "openrouter:gemini-flash-1.5" }
  ],
  "codex:cli": [
    { platform: "roo:cli", model: "roo:cli" },
    { platform: "kilo:cli", model: "kilo:cli" },
    { platform: "openrouter:deepseek-r1", model: "openrouter:deepseek-r1" }
  ],
  "roo:cli": [
    { platform: "codex:cli", model: "codex:cli" },
    { platform: "kilo:cli", model: "kilo:cli" },
    { platform: "openrouter:deepseek-r1", model: "openrouter:deepseek-r1" }
  ],
  "kilo:cli": [
    { platform: "codex:cli", model: "codex:cli" },
    { platform: "roo:cli", model: "roo:cli" },
    { platform: "openrouter:deepseek-r1", model: "openrouter:deepseek-r1" }
  ],
  "opencode-studio": [
    { platform: "openrouter:deepseek-r1", model: "openrouter:deepseek-r1" },
    { platform: "openrouter:gemini-flash-1.5", model: "openrouter:gemini-flash-1.5" },
    { platform: "openrouter:qwen-max", model: "openrouter:qwen-max" }
  ],
  "openrouter:deepseek-r1": [
    { platform: "openrouter:gemini-flash-1.5", model: "openrouter:gemini-flash-1.5" },
    { platform: "openrouter:qwen-max", model: "openrouter:qwen-max" }
  ]
};

const CLI_HINT_REGEX = /cli|codex|roo|kilo|terminal/i;

class PlatformRateLimitedError extends Error {
  constructor(public readonly platform: string, public readonly evaluation: RateLimitEvaluation | null) {
    super(
      evaluation?.reason
        ? `Platform ${platform} is temporarily rate limited (${evaluation.reason}).`
        : `Platform ${platform} is temporarily rate limited.`
    );
  }
}

export type AssignmentChannel = "cli" | "web_studio" | "visual";

function determineChannel(modelTags: string[] = [], platformId: string): "cli" | "web_studio" | "visual" {
  if (modelTags.includes("web_studio") || /web|studio/i.test(platformId)) {
    return "web_studio";
  }
  if (platformId.startsWith("browser-use")) {
    return "visual";
  }
  if (CLI_HINT_REGEX.test(platformId)) {
    return "cli";
  }
  return modelTags.includes("cli_agent") ? "cli" : "web_studio";
}

function buildAgentNotes(
  channel: "cli" | "web_studio" | "visual",
  packet: TaskPacket,
  modelDisplay: string,
  override?: FallbackTarget
): string[] {
  const notes: string[] = [];
  notes.push(`Platform: ${modelDisplay}`);
  if (override) {
    notes.push(`Fallback from ${packet.execution.platform} -> ${override.platform}`);
  }
  switch (channel) {
    case "web_studio":
      notes.push("Use the hosted studio in a new browser session.");
      notes.push("Paste the packet instructions verbatim, including context goal and acceptance criteria.");
      notes.push("Capture the resulting chat URL and include it in your completion.");
      break;
    case "visual":
      notes.push("Execute via Browser-Use DevTools MCP with human visual approval.");
      notes.push("Upload screenshots or checklist output as required.");
      break;
    case "cli":
    default:
      notes.push("Carry out the task in your CLI/IDE environment (Codex, Roo, Kilo, etc.).");
      notes.push("Commit work in the slice branch or attach a diff in your completion response.");
      break;
  }
  if (packet.handoff_expectations?.length) {
    notes.push("Handoff expectations:");
    packet.handoff_expectations.forEach((expectation) => notes.push(`- ${expectation}`));
  }
  return notes;
}

async function countPreviousAttempts(taskId: string): Promise<number> {
  const entries = await readJsonFile<AssignmentLogEntry[]>(files.assignmentLog, []);
  return entries.filter((entry) => entry.taskId === taskId).length;
}

async function selectFallbackExecution(currentPlatform: string, currentModel: string): Promise<FallbackTarget | null> {
  const candidates = PLATFORM_FALLBACKS[currentPlatform] ?? [];
  for (const candidate of candidates) {
    const model = await getModelDefinition(candidate.model);
    if (!model || candidate.model === currentModel) {
      continue;
    }
    const availability = await isPlatformAllowed(candidate.platform);
    if (!availability.allowed) {
      if (availability.evaluation?.rule.mode === 'monitor' && availability.evaluation.status === 'exceeded') {
        console.warn(
          `[dispatcher] ${candidate.platform} is over its monitor-only limit (${availability.evaluation.reason ?? 'limit'}) but will remain eligible.`
        );
      }
      if (!availability.allowed) {
        console.warn(
          `[dispatcher] skipping fallback ${candidate.platform}: rate limit exceeded (${availability.evaluation?.reason ?? 'limit'})`
        );
        continue;
      }
    }
    return candidate;
  }
  return null;
}

async function buildAssignment(
  ideaId: string,
  sliceId: string,
  packetPath: string,
  packet: TaskPacket,
  ensureQueueDir: boolean,
  overrideExecution?: FallbackTarget
): Promise<BuildAssignmentResult> {
  let executionPlatform = overrideExecution?.platform ?? packet.execution.platform;
  let executionModel = overrideExecution?.model ?? packet.execution.model;
  let appliedOverride = overrideExecution;

  let availability = await isPlatformAllowed(executionPlatform);
  if (availability.evaluation?.rule.mode === 'monitor' && availability.evaluation.status === 'exceeded') {
    console.warn(
      `[dispatcher] ${executionPlatform} is over its monitor-only limit (${availability.evaluation.reason ?? 'limit'}) but assignments will continue.`
    );
  }
  if (!availability.allowed) {
    const fallback = await selectFallbackExecution(executionPlatform, executionModel);
    if (!fallback) {
      throw new PlatformRateLimitedError(executionPlatform, availability.evaluation);
    }
    executionPlatform = fallback.platform;
    executionModel = fallback.model;
    appliedOverride = fallback;
    availability = await isPlatformAllowed(executionPlatform);
    if (!availability.allowed) {
      throw new PlatformRateLimitedError(executionPlatform, availability.evaluation);
    }
    if (availability.evaluation?.rule.mode === 'monitor' && availability.evaluation.status === 'exceeded') {
      console.warn(
        `[dispatcher] ${executionPlatform} is over its monitor-only limit (${availability.evaluation.reason ?? 'limit'}) but assignments will continue.`
      );
    }
  }

  const modelId = executionModel;
  const model = await getModelDefinition(modelId);
  if (!model) {
    throw new Error(`Model '${modelId}' referenced by ${packet.task_id} not found in registry.`);
  }

  const channel = determineChannel(model.tags ?? [], executionPlatform);
  const ideaQueueDir = path.join(directories.tasksQueue, ideaId);
  if (ensureQueueDir) {
    await fs.mkdir(ideaQueueDir, { recursive: true });
  }
  const queuePath = path.join(ideaQueueDir, `${packet.task_id}.json`);
  const notes = buildAgentNotes(channel, packet, model.display_name ?? model.id, appliedOverride);
  const payload = {
    idea_id: ideaId,
    slice_id: sliceId,
    task_id: packet.task_id,
    assignment_type: channel,
    platform: executionPlatform,
    model: executionModel,
    model_display: model.display_name ?? model.id,
    requires_chat_url: Boolean(packet.execution.require_chat_url),
    deliverables: packet.deliverables,
    context: packet.context,
    instructions: packet.instructions,
    acceptance_criteria: packet.acceptance_criteria,
    validation: packet.validation,
    notes
  };
  const attempt = (await countPreviousAttempts(packet.task_id)) + 1;
  return {
    assignment: {
      ideaId,
      sliceId,
      taskId: packet.task_id,
      channel,
      queuePath,
      platform: executionPlatform,
      model: executionModel
    },
    payload,
    attempt
  };
}

async function loadTaskPacket(packetPath: string): Promise<TaskPacket> {
  const raw = await fs.readFile(packetPath, "utf8");
  return JSON.parse(raw) as TaskPacket;
}

export interface QueuedAssignment {
  ideaId: string;
  sliceId: string;
  taskId: string;
  channel: AssignmentChannel;
  queuePath: string;
  platform: string;
  model: string;
}

interface AssignmentLogEntry {
  taskId: string;
  attempt: number;
}

interface BuildAssignmentResult {
  assignment: QueuedAssignment;
  payload: Record<string, unknown>;
  attempt: number;
}

export async function queueAssignmentsForIdea(
  ideaId: string,
  { dryRun = false }: { dryRun?: boolean } = {}
): Promise<QueuedAssignment[]> {
  const context = await loadOrchestratorContext(ideaId);
  const queueDir = path.join(directories.tasksQueue, ideaId);

  if (!dryRun) {
    await fs.rm(queueDir, { recursive: true, force: true });
  }

  const assignments: QueuedAssignment[] = [];

  for (const slice of context.slices) {
    for (const packetInfo of slice.taskPackets) {
      const packet = await loadTaskPacket(packetInfo.path);
      try {
        const { assignment, payload, attempt } = await buildAssignment(ideaId, slice.sliceId, packetInfo.path, packet, !dryRun);
        assignments.push(assignment);

        if (!dryRun) {
          await fs.mkdir(path.dirname(assignment.queuePath), { recursive: true });
          await writeJsonFile(assignment.queuePath, payload);
          await recordAssignment({
            taskId: assignment.taskId,
            sliceId: assignment.sliceId,
            attempt,
            status: "assigned",
            platform: assignment.platform,
            model: assignment.model,
            metadata: {
              idea_id: ideaId,
              assignment_type: assignment.channel,
              packet_path: path.relative(directories.root, packetInfo.path)
            }
          });
        }
      } catch (error) {
        if (error instanceof PlatformRateLimitedError) {
          console.warn(`[dispatcher] skipping ${packet.task_id}: ${error.message}`);
          continue;
        }
        throw error;
      }
    }
  }

  return assignments;
}

export interface RequeueResult {
  assignment?: QueuedAssignment;
  fallbackUsed?: FallbackTarget | null;
}

export async function requeueTask(
  ideaId: string,
  taskId: string,
  { useFallback = false }: { useFallback?: boolean } = {}
): Promise<RequeueResult> {
  const context = await loadOrchestratorContext(ideaId);
  let target: { sliceId: string; packet: TaskPacket; path: string } | null = null;
  for (const slice of context.slices) {
    const packetInfo = slice.taskPackets.find((p) => p.taskId === taskId);
    if (packetInfo) {
      const packet = await loadTaskPacket(packetInfo.path);
      target = { sliceId: slice.sliceId, packet, path: packetInfo.path };
      break;
    }
  }

  if (!target) {
    throw new Error(`Task ${taskId} not found for idea ${ideaId}.`);
  }

  let overrideExecution: FallbackTarget | undefined;
  let fallbackUsed: FallbackTarget | null = null;
  if (useFallback) {
    fallbackUsed = await selectFallbackExecution(target.packet.execution.platform, target.packet.execution.model);
    if (!fallbackUsed) {
      return { fallbackUsed: null };
    }
    overrideExecution = fallbackUsed;
  }

  const { assignment, payload, attempt } = await buildAssignment(
    ideaId,
    target.sliceId,
    target.path,
    target.packet,
    true,
    overrideExecution
  );

  await writeJsonFile(assignment.queuePath, payload);
  await recordAssignment({
    taskId: assignment.taskId,
    sliceId: assignment.sliceId,
    attempt,
    status: "assigned",
    platform: assignment.platform,
    model: assignment.model,
    metadata: {
      idea_id: ideaId,
      assignment_type: assignment.channel,
      packet_path: path.relative(directories.root, target.path),
      fallback: useFallback ? (fallbackUsed ? `${target.packet.execution.platform} -> ${assignment.platform}` : "none") : undefined
    }
  });

  return { assignment, fallbackUsed };
}




