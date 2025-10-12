import fs from "fs/promises";
import { Dirent } from "fs";
import path from "path";
import { directories } from "../config/paths";
import { loadModelRegistry } from "../config/registry";
import { ensureStageAtLeast, loadIdeaStatus, markIdeaStage } from "../ideas/status";
import { writeJsonFile } from "../utils/jsonFile";
import { recordValidationOutcome } from "./validationLog";

const ALLOWED_BASE_DIRS = new Set([
  "src",
  "scripts",
  "docs",
  "data",
  "openspec",
  "planner",
  "examples",
  "dashboard",
  "__tests__"
]);

type ValidationStatus = "pass" | "fail";

interface SupervisorCheck {
  name: string;
  status: ValidationStatus;
  details?: string;
}

interface SupervisorTaskSummary {
  task_id: string;
  title: string;
  confidence: number;
  deliverables: string[];
  platform: string;
  model: string;
  require_chat_url: boolean;
}

interface SupervisorSliceSummary {
  slice_id: string;
  name: string;
  goal: string;
  tasks: SupervisorTaskSummary[];
}

export interface SupervisorReport {
  idea_id: string;
  validated_at: string;
  status: "approved" | "rejected";
  checks: SupervisorCheck[];
  slices: SupervisorSliceSummary[];
}

interface LoadedPlanSlice {
  sliceId: string;
  plan: any;
  taskPackets: Record<string, any>;
}

async function loadPlanSlices(ideaId: string): Promise<LoadedPlanSlice[]> {
  const planRoot = path.join(directories.root, "data", "taskpackets", ideaId);
  let entries: Dirent[];
  try {
    entries = await fs.readdir(planRoot, { withFileTypes: true });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`No planner output found for idea '${ideaId}'. Expected directory ${planRoot}`);
    }
    throw error;
  }

  const slices: LoadedPlanSlice[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const sliceId = entry.name;
    const sliceDir = path.join(planRoot, sliceId);
    const planPath = path.join(sliceDir, "plan.json");
    const rawPlan = await fs.readFile(planPath, "utf8");
    const plan = JSON.parse(rawPlan);
    const taskPackets: Record<string, any> = {};
    const files = await fs.readdir(sliceDir);
    for (const file of files) {
      if (file === "plan.json" || !file.endsWith(".json")) {
        continue;
      }
      const taskId = file.replace(/\.json$/, "");
      const taskRaw = await fs.readFile(path.join(sliceDir, file), "utf8");
      taskPackets[taskId] = JSON.parse(taskRaw);
    }
    slices.push({ sliceId, plan, taskPackets });
  }

  if (!slices.length) {
    throw new Error(`No slice folders found under ${planRoot}`);
  }

  return slices;
}

function normalizeDeliverable(relPath: string): string {
  return relPath.replace(/\\/g, "/");
}

function ensureSafeDeliverable(relPath: string): void {
  const normalized = normalizeDeliverable(relPath);
  if (!normalized || normalized.startsWith("/")) {
    throw new Error(`Deliverable '${relPath}' must be a relative path inside the repository`);
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) {
    throw new Error(`Deliverable '${relPath}' attempts to escape repository boundaries`);
  }
  const base = segments[0];
  if (!ALLOWED_BASE_DIRS.has(base)) {
    throw new Error(`Deliverable '${relPath}' targets unsupported base directory '${base}'`);
  }
}

function collectTasks(slice: LoadedPlanSlice): SupervisorTaskSummary[] {
  const planSlices = Array.isArray(slice.plan.slices) ? slice.plan.slices : [];
  const summaries: SupervisorTaskSummary[] = [];
  for (const section of planSlices) {
    const tasks = Array.isArray(section.tasks) ? section.tasks : [];
    for (const task of tasks) {
      const packet = slice.taskPackets[task.task_id] ?? {};
      const deliverables = (packet.deliverables ?? []).map((item: string) => normalizeDeliverable(item));
      summaries.push({
        task_id: task.task_id,
        title: packet.title ?? task.title ?? "",
        confidence: task.confidence ?? packet.confidence ?? 0,
        deliverables,
        platform: packet.execution?.platform ?? "unknown",
        model: packet.execution?.model ?? "unknown",
        require_chat_url: Boolean(packet.execution?.require_chat_url)
      });
    }
  }
  return summaries;
}

export async function validatePlannerOutput(ideaId: string): Promise<SupervisorReport> {
  const status = await loadIdeaStatus(ideaId);
  if (status.stage !== "plan_generated" && status.stage !== "supervisor_ready") {
    throw new Error(`Idea '${ideaId}' must be at stage 'plan_generated' before supervisor review (current: ${status.stage}).`);
  }
  ensureStageAtLeast(status, "plan_generated");
  const canPromote = status.stage === "plan_generated";

  const [planSlices, prdSummary, modelRegistry, researchBrief, analystReview] = await Promise.all([
    loadPlanSlices(ideaId),
    fs
      .readFile(path.join(directories.root, "data", "ideas", ideaId, "prd.summary.json"), "utf8")
      .then((raw) => JSON.parse(raw)),
    loadModelRegistry(),
    fs
      .readFile(path.join(directories.root, "data", "ideas", ideaId, "research.brief.json"), "utf8")
      .then((raw) => JSON.parse(raw)),
    fs
      .readFile(path.join(directories.root, "data", "ideas", ideaId, "analyst.review.json"), "utf8")
      .then((raw) => JSON.parse(raw))
  ]);

  const checks: SupervisorCheck[] = [];
  let failures = 0;
  const pushCheck = (name: string, statusValue: ValidationStatus, details?: string) => {
    if (statusValue === "fail") {
      failures += 1;
    }
    checks.push({ name, status: statusValue, details });
  };

  pushCheck(
    "artifact:research",
    researchBrief.idea_id === ideaId ? "pass" : "fail",
    researchBrief.idea_id === ideaId ? undefined : `research.brief.idea_id=${researchBrief.idea_id}`
  );
  pushCheck(
    "artifact:analyst",
    analystReview.idea_id === ideaId ? "pass" : "fail",
    analystReview.idea_id === ideaId ? undefined : `analyst.review.idea_id=${analystReview.idea_id}`
  );

  const approvedCore: string[] = analystReview.approved_features?.core ?? [];
  const approvedGap: string[] = analystReview.approved_features?.gap ?? [];
  const prdCore: string[] = prdSummary.features?.core ?? [];
  const prdGap: string[] = prdSummary.features?.gap ?? [];

  const missingCore = approvedCore.filter((feature) => !prdCore.includes(feature));
  pushCheck(
    "features:core",
    missingCore.length === 0 ? "pass" : "fail",
    missingCore.length ? `Missing core features in PRD: ${missingCore.join(', ')}` : undefined
  );

  const missingGap = approvedGap.filter((feature) => !prdGap.includes(feature));
  pushCheck(
    "features:gap",
    missingGap.length === 0 ? "pass" : "fail",
    missingGap.length ? `Missing gap features in PRD: ${missingGap.join(', ')}` : undefined
  );

  const minConfidence: number = prdSummary.model_policies?.min_confidence ?? 0.95;
  const allowedModels = new Set(modelRegistry.models.map((model) => model.id));
  const visualPlatform: string = prdSummary.model_policies?.visual_platform ?? "";
  const slices: SupervisorSliceSummary[] = [];

  for (const slice of planSlices) {
    const taskSummaries = collectTasks(slice);

    for (const task of taskSummaries) {
      pushCheck(
        `confidence:${task.task_id}`,
        task.confidence >= minConfidence ? "pass" : "fail",
        task.confidence >= minConfidence
          ? undefined
          : `Task ${task.task_id} confidence ${task.confidence} below minimum ${minConfidence}`
      );

      pushCheck(
        `model:${task.task_id}`,
        allowedModels.has(task.model) ? "pass" : "fail",
        allowedModels.has(task.model) ? undefined : `Model ${task.model} not declared in data/registry/models.json`
      );

      const invalidDeliverables: string[] = [];
      task.deliverables.forEach((deliverable) => {
        try {
          ensureSafeDeliverable(deliverable);
        } catch (error: any) {
          invalidDeliverables.push(error.message ?? String(error));
        }
      });
      pushCheck(
        `deliverables:${task.task_id}`,
        invalidDeliverables.length === 0 ? "pass" : "fail",
        invalidDeliverables.length ? invalidDeliverables.join("; ") : undefined
      );

      const platformLower = task.platform.toLowerCase();
      const requiresChatUrl = platformLower.includes("opencode") || task.platform === visualPlatform;
      pushCheck(
        `chat_url:${task.task_id}`,
        requiresChatUrl ? (task.require_chat_url ? "pass" : "fail") : "pass",
        requiresChatUrl && !task.require_chat_url
          ? `Platform ${task.platform} requires chat URL but task did not set execution.require_chat_url`
          : undefined
      );
    }

    const slicePlan = Array.isArray(slice.plan.slices) ? slice.plan.slices[0] : undefined;
    slices.push({
      slice_id: slice.sliceId,
      name: slicePlan?.name ?? "",
      goal: slicePlan?.goal ?? "",
      tasks: taskSummaries
    });
  }

  const statusText: "approved" | "rejected" = failures === 0 ? "approved" : "rejected";
  const report: SupervisorReport = {
    idea_id: ideaId,
    validated_at: new Date().toISOString(),
    status: statusText,
    checks,
    slices
  };

  const reportPath = path.join(directories.root, "docs", "reports", "supervisor", `${ideaId}.json`);
  await writeJsonFile(reportPath, report);

  await recordValidationOutcome({
    taskId: "plan-gate",
    sliceId: slices[0]?.slice_id,
    status: failures === 0 ? "pass" : "fail",
    reviewer: "supervisor",
    checkpoints: checks.map((check) => ({
      name: check.name,
      status: check.status,
      details: check.details
    }))
  });

  if (failures === 0 && canPromote) {
    await markIdeaStage(ideaId, "supervisor_ready");
  }

  if (failures > 0) {
    throw new Error(`Supervisor gate rejected plan for '${ideaId}'. See ${reportPath}`);
  }

  return report;
}
