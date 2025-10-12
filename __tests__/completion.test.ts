import { promises as fs } from "fs";
import os from "os";
import path from "path";
import type { RequeueResult } from "../src/orchestrator/dispatcher";

describe("processCompletion", () => {
  interface TestContext {
    root: string;
    processCompletion: typeof import("../src/orchestrator/completion").processCompletion;
    requeueTask: jest.MockedFunction<(ideaId: string, taskId: string, opts: { useFallback?: boolean }) => Promise<RequeueResult>>;
  }

  async function withCompletionModule(run: (context: TestContext) => Promise<void>) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "vibeflow-completion-"));
    const brevoEnv = {
      BREVO_API_KEY: process.env.BREVO_API_KEY,
      BREVO_TO: process.env.BREVO_TO,
      BREVO_FROM_EMAIL: process.env.BREVO_FROM_EMAIL,
      BREVO_FROM_NAME: process.env.BREVO_FROM_NAME
    };
    try {
      delete process.env.BREVO_API_KEY;
      delete process.env.BREVO_TO;
      delete process.env.BREVO_FROM_EMAIL;
      delete process.env.BREVO_FROM_NAME;

      process.env.VIBEFLOW_ROOT = root;
      jest.resetModules();
      jest.doMock("../src/orchestrator/dispatcher", () => ({
        requeueTask: jest.fn()
      }));

      const { processCompletion } = await import("../src/orchestrator/completion");
      const dispatcher = await import("../src/orchestrator/dispatcher");
      const requeueTask = dispatcher.requeueTask as jest.MockedFunction<
        (ideaId: string, taskId: string, opts: { useFallback?: boolean }) => Promise<RequeueResult>
      >;
      requeueTask.mockReset();

      await run({ root, processCompletion, requeueTask });
    } finally {
      jest.unmock("../src/orchestrator/dispatcher");
      jest.resetModules();
      delete process.env.VIBEFLOW_ROOT;
      for (const [key, value] of Object.entries(brevoEnv)) {
        if (value === undefined) {
          delete (process.env as NodeJS.ProcessEnv)[key];
        } else {
          (process.env as NodeJS.ProcessEnv)[key] = value;
        }
      }
      await fs.rm(root, { recursive: true, force: true });
    }
  }

  async function seedAssignmentLog(root: string, entries: any[]) {
    const logPath = path.join(root, "data", "state", "assignment.log.json");
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.writeFile(logPath, JSON.stringify(entries, null, 2), "utf8");
  }

  async function seedQueue(root: string, ideaId: string, taskId: string) {
    const queuePath = path.join(root, "data", "tasks", "queued", ideaId, `${taskId}.json`);
    await fs.mkdir(path.dirname(queuePath), { recursive: true });
    await fs.writeFile(queuePath, JSON.stringify({}), "utf8");
  }

  it("sends credit alert and reroutes to fallback", async () => {
    await withCompletionModule(async ({ root, processCompletion, requeueTask }) => {
      await seedAssignmentLog(root, [
        {
          taskId: "S1.1",
          attempt: 1,
          status: "assigned",
          platform: "vscode-codex",
          model: "openai:gpt-4.1-mini",
          timestamp: new Date().toISOString()
        }
      ]);
      await seedQueue(root, "idea-1", "S1.1");

      requeueTask.mockResolvedValueOnce({ fallbackUsed: { platform: "codex:cli", model: "codex:cli" } } as RequeueResult);

      const alert = jest.fn();
      const result = await processCompletion(
        {
          idea_id: "idea-1",
          task_id: "S1.1",
          slice_id: "S1",
          status: "failed",
          platform: "vscode-codex",
          model: "openai:gpt-4.1-mini",
          reason: "credits_exhausted"
        },
        { sendCreditAlert: alert }
      );

      expect(alert).toHaveBeenCalledWith({
        ideaId: "idea-1",
        taskId: "S1.1",
        platform: "vscode-codex",
        model: "openai:gpt-4.1-mini",
        reason: "credits_exhausted"
      });
      expect(requeueTask).toHaveBeenCalledTimes(1);
      expect(requeueTask).toHaveBeenCalledWith("idea-1", "S1.1", { useFallback: true });
      expect(result).toEqual({ recordedStatus: "failed", fallbackUsed: "vscode-codex -> codex:cli" });

      await expect(fs.stat(path.join(root, "data", "tasks", "queued", "idea-1", "S1.1.json"))).rejects.toThrow();

      const logPath = path.join(root, "data", "state", "assignment.log.json");
      const entries = JSON.parse(await fs.readFile(logPath, "utf8"));
      expect(entries).toHaveLength(2);
      expect(entries[1]).toMatchObject({ status: "failed", notes: "credits_exhausted" });
    });
  });

  it("requeues without alert for non-credit failures", async () => {
    await withCompletionModule(async ({ root, processCompletion, requeueTask }) => {
      await seedAssignmentLog(root, [
        {
          taskId: "S2.4",
          attempt: 1,
          status: "assigned",
          platform: "codex:cli",
          model: "codex:cli",
          timestamp: new Date().toISOString()
        }
      ]);
      await seedQueue(root, "idea-2", "S2.4");

      requeueTask.mockResolvedValue({ fallbackUsed: null });

      const result = await processCompletion({
        idea_id: "idea-2",
        task_id: "S2.4",
        slice_id: "S2",
        status: "failed",
        platform: "codex:cli",
        model: "codex:cli",
        reason: "timeout"
      });

      expect(requeueTask).toHaveBeenCalledTimes(1);
      expect(requeueTask).toHaveBeenCalledWith("idea-2", "S2.4", { useFallback: false });
      expect(result).toEqual({ recordedStatus: "failed", fallbackUsed: null });
    });
  });

  it("falls back to original platform when no alternate is available", async () => {
    await withCompletionModule(async ({ root, processCompletion, requeueTask }) => {
      await seedAssignmentLog(root, [
        {
          taskId: "S3.2",
          attempt: 1,
          status: "assigned",
          platform: "openrouter:deepseek-r1",
          model: "openrouter:deepseek-r1",
          timestamp: new Date().toISOString()
        }
      ]);
      await seedQueue(root, "idea-3", "S3.2");

      requeueTask
        .mockResolvedValueOnce({ fallbackUsed: null })
        .mockResolvedValueOnce({ fallbackUsed: null });

      const result = await processCompletion({
        idea_id: "idea-3",
        task_id: "S3.2",
        slice_id: "S3",
        status: "failed",
        platform: "openrouter:deepseek-r1",
        model: "openrouter:deepseek-r1",
        reason: "credits_exhausted"
      });

      expect(requeueTask).toHaveBeenNthCalledWith(1, "idea-3", "S3.2", { useFallback: true });
      expect(requeueTask).toHaveBeenNthCalledWith(2, "idea-3", "S3.2", { useFallback: false });
      expect(result).toEqual({ recordedStatus: "failed", fallbackUsed: null });
    });
  });
  it("queues test assignment when task succeeds", async () => {
    await withCompletionModule(async ({ root, processCompletion, requeueTask }) => {
      await seedAssignmentLog(root, [
        {
          taskId: "S4.1",
          attempt: 1,
          status: "assigned",
          platform: "codex:cli",
          model: "codex:cli",
          timestamp: new Date().toISOString()
        }
      ]);

      const packetDir = path.join(root, "data", "taskpackets", "idea-4", "S4");
      await fs.mkdir(packetDir, { recursive: true });
      await fs.writeFile(
        path.join(packetDir, "S4.1.json"),
        JSON.stringify({
          task_id: "S4.1",
          validation: [
            { name: "unit-tests", tool: "npm test" },
            { name: "manual-run", tool: "npm run lint" }
          ],
          acceptance_criteria: ["tests pass"],
          deliverables: ["docs/report.md"],
          title: "Demo Task"
        }, null, 2)
      );

      const result = await processCompletion({
        idea_id: "idea-4",
        task_id: "S4.1",
        slice_id: "S4",
        status: "success",
        platform: "codex:cli",
        model: "codex:cli",
        tokens: { prompt: 10, completion: 5 },
        cost_usd: 0.05,
        metadata: {
          branch_suggested: "agent/idea-4/S4/S4.1/attempt-01",
          branch_test_suggested: "test/idea-4/S4/S4.1/attempt-01",
          branch_review_suggested: "review/idea-4/S4/S4.1"
        }
      });

      expect(result).toEqual({ recordedStatus: "completed", fallbackUsed: null });
      expect(requeueTask).not.toHaveBeenCalled();

      const testsQueuedDir = path.join(root, "data", "tasks", "tests", "queued");
      await expect(fs.access(testsQueuedDir)).resolves.not.toThrow();
      const queuedPath = path.join(
        root,
        "data",
        "tasks",
        "tests",
        "queued",
        "idea-4",
        "S4.1.attempt-02.test-01.json"
      );
      const queuedRaw = await fs.readFile(queuedPath, "utf8");
      const queued = JSON.parse(queuedRaw);
      expect(queued.validations).toHaveLength(2);
      expect(queued.branch.test).toBe("test/idea-4/S4/S4.1/attempt-01");

      const logRaw = await fs.readFile(path.join(root, "data", "state", "assignment.log.json"), "utf8");
      const entries = JSON.parse(logRaw);
      expect(entries).toHaveLength(3);
      expect(entries[1]).toMatchObject({ status: "completed" });
      expect(entries[2]).toMatchObject({ metadata: expect.objectContaining({ assignment_type: "test" }) });
    });
  });

});
