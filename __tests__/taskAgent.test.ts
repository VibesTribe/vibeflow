import { promises as fs } from "fs";
import os from "os";
import path from "path";

async function writeJson(target: string, data: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2), "utf8");
}

describe("task agent workflow", () => {
  async function withTaskAgentEnv<T>(run: (ctx: {
    root: string;
    claimAssignment: typeof import("../src/taskAgent/claim").claimAssignment;
    completeAssignment: typeof import("../src/taskAgent/complete").completeAssignment;
    listQueuedAssignments: typeof import("../src/taskAgent/claim").listQueuedAssignments;
  }) => Promise<T>): Promise<T> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "vibeflow-task-agent-"));
    const originalEnv = { ...process.env };
    try {
      process.env.VIBEFLOW_ROOT = root;
      jest.resetModules();
      const { claimAssignment, listQueuedAssignments } = await import("../src/taskAgent/claim");
      const { completeAssignment } = await import("../src/taskAgent/complete");
      return await run({ root, claimAssignment, listQueuedAssignments, completeAssignment });
    } finally {
      Object.assign(process.env, originalEnv);
      await fs.rm(root, { recursive: true, force: true });
    }
  }

  it("claims the oldest queued task and writes an in-progress record", async () => {
    await withTaskAgentEnv(async ({ root, claimAssignment }) => {
      const payload = {
        idea_id: "alpha",
        slice_id: "S1",
        task_id: "S1.1",
        assignment_type: "cli",
        platform: "codex:cli",
        model: "codex:cli",
        model_display: "Codex CLI",
        requires_chat_url: false,
        deliverables: ["README.md"],
        context: { goal: "demo" },
        instructions: ["Do the thing"],
        acceptance_criteria: ["done"],
        validation: [],
        notes: ["note"]
      };
      await writeJson(path.join(root, "data/tasks/queued/alpha/S1.1.json"), payload);

      const result = await claimAssignment();
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.record.task_id).toBe("S1.1");
      expect(result.record.branch.work.suggested).toContain("agent/alpha/S1/S1.1");

      await expect(fs.access(path.join(root, "data/tasks/queued/alpha/S1.1.json"))).rejects.toThrow();
      const inProgressPath = path.join(root, "data/tasks/in-progress/alpha/S1.1.json");
      const inProgressRaw = await fs.readFile(inProgressPath, "utf8");
      const inProgress = JSON.parse(inProgressRaw);
      expect(inProgress.payload.instructions).toHaveLength(1);
      expect(inProgress.attempt).toBe(1);
    });
  });

  it("completes a claimed task and records completion", async () => {
    await withTaskAgentEnv(async ({ root, claimAssignment, completeAssignment }) => {
      const payload = {
        idea_id: "beta",
        slice_id: "S2",
        task_id: "S2.1",
        assignment_type: "cli",
        platform: "codex:cli",
        model: "codex:cli",
        deliverables: ["docs/report.md"],
        context: { goal: "test" },
        instructions: ["Edit file"],
        acceptance_criteria: ["pass"],
        validation: [],
        notes: []
      };
      await writeJson(path.join(root, "data/tasks/queued/beta/S2.1.json"), payload);
      await writeJson(path.join(root, "data/state/assignment.log.json"), []);

      const claim = await claimAssignment({ ideaId: "beta" });
      expect(claim).not.toBeNull();

      const result = await completeAssignment({
        ideaId: "beta",
        taskId: "S2.1",
        status: "success",
        costUsd: 0.5,
        tokens: { prompt: 100, completion: 50 },
        metadata: { verifier: "unit" }
      });
      expect(result.dryRun).toBe(false);
      expect(result.payload.status).toBe("success");

      const inProgressPath = path.join(root, "data/tasks/in-progress/beta/S2.1.json");
      await expect(fs.access(inProgressPath)).rejects.toThrow();

      const logRaw = await fs.readFile(path.join(root, "data/state/assignment.log.json"), "utf8");
      const entries = JSON.parse(logRaw);
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({
        taskId: "S2.1",
        status: "completed",
        platform: "codex:cli",
        model: "codex:cli",
        tokens: { prompt: 100, completion: 50 }
      });
    });
  });
});
