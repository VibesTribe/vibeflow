import fs from "fs/promises";
import type { Dirent } from "fs";
import path from "path";
import { directories } from "../config/paths";
import { ensureStageAtLeast, loadIdeaStatus, type IdeaStatus } from "../ideas/status";

interface OrchestratorTaskPacket {
  taskId: string;
  path: string;
}

interface OrchestratorSlice {
  sliceId: string;
  planPath: string;
  taskPackets: OrchestratorTaskPacket[];
  plan: unknown;
}

export interface OrchestratorContext {
  ideaId: string;
  status: IdeaStatus;
  supervisorReportPath: string;
  supervisorReport: any;
  planRoot: string;
  slices: OrchestratorSlice[];
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function ensureSupervisorReport(ideaId: string): Promise<{ path: string; report: any }> {
  const supervisorReportPath = path.join(directories.root, "docs", "reports", "supervisor", `${ideaId}.json`);
  try {
    const report = await readJson<any>(supervisorReportPath);
    if (report.status !== "approved") {
      throw new Error(
        `Supervisor report for '${ideaId}' is '${report.status}'. Orchestrator requires an approved supervisor gate.`
      );
    }
    return { path: supervisorReportPath, report };
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`Supervisor report missing for idea '${ideaId}'. Run npm run supervisor:gate -- ${ideaId}.`);
    }
    throw error;
  }
}

async function loadPlanSlices(planRoot: string): Promise<OrchestratorSlice[]> {
  let entries: Dirent[];
  try {
    entries = await fs.readdir(planRoot, { withFileTypes: true });
  } catch (error: any) {
    if (error.code === "ENOENT") {
      throw new Error(`Planner output not found at ${planRoot}. Run npm run planner:generate for this idea.`);
    }
    throw error;
  }

  const slices: OrchestratorSlice[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const sliceId = entry.name;
    const sliceDir = path.join(planRoot, sliceId);
    const planPath = path.join(sliceDir, "plan.json");

    let plan: unknown;
    try {
      plan = await readJson(planPath);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        throw new Error(`Slice '${sliceId}' is missing plan.json. Regenerate planner outputs before orchestration.`);
      }
      throw error;
    }

    const files = await fs.readdir(sliceDir);
    const taskPackets: OrchestratorTaskPacket[] = files
      .filter((file) => file.endsWith(".json") && file !== "plan.json")
      .map((file) => ({
        taskId: file.replace(/\.json$/, ""),
        path: path.join(sliceDir, file)
      }));

    if (!taskPackets.length) {
      throw new Error(`Slice '${sliceId}' has no task packets. Regenerate planner outputs before orchestration.`);
    }

    slices.push({
      sliceId,
      planPath,
      taskPackets,
      plan
    });
  }

  if (!slices.length) {
    throw new Error(`No slice directories found under ${planRoot}.`);
  }

  slices.sort((a, b) => a.sliceId.localeCompare(b.sliceId));
  return slices;
}

export async function loadOrchestratorContext(ideaId: string): Promise<OrchestratorContext> {
  const status = await loadIdeaStatus(ideaId);
  ensureStageAtLeast(status, "supervisor_ready");

  const { path: supervisorReportPath, report: supervisorReport } = await ensureSupervisorReport(ideaId);
  const planRoot = path.join(directories.root, "data", "taskpackets", ideaId);
  const slices = await loadPlanSlices(planRoot);

  return {
    ideaId,
    status,
    supervisorReportPath,
    supervisorReport,
    planRoot,
    slices
  };
}

export async function assertOrchestratorReady(ideaId: string): Promise<void> {
  await loadOrchestratorContext(ideaId);
}
