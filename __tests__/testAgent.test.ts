import { promises as fs } from "fs";
import os from "os";
import path from "path";

async function writeJson(target: string, data: unknown) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2), "utf8");
}

describe("test agent workflow", () => {
  interface TestContext {
    root: string;
    claimTestAssignment: typeof import("../src/testAgent/claim").claimTestAssignment;
    listQueuedTestAssignments: typeof import("../src/testAgent/claim").listQueuedTestAssignments;
    completeTestAssignment: typeof import("../src/testAgent/complete").completeTestAssignment;
  }

  async function withTestAgentEnv(run: (ctx: TestContext) => Promise<void>) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "vibeflow-test-agent-"));
    try {
      process.env.VIBEFLOW_ROOT = root;
      jest.resetModules();
      const claimModule = await import("../src/testAgent/claim");
      const completeModule = await import("../src/testAgent/complete");
      await run({
        root,
        claimTestAssignment: claimModule.claimTestAssignment,
        listQueuedTestAssignments: claimModule.listQueuedTestAssignments,
        completeTestAssignment: completeModule.completeTestAssignment
      });
    } finally {
      delete process.env.VIBEFLOW_ROOT;
      await fs.rm(root, { recursive: true, force: true });
    }
  }

  it("claims queued test assignment and writes in-progress record", async () => {
    await withTestAgentEnv(async ({ root, claimTestAssignment, listQueuedTestAssignments }) => {
      const payload = {
        idea_id: "gamma",
        slice_id: "G1",
        task_id: "G1.1",
        source_attempt: 1,
        test_attempt: 1,
        assignment_type: "test",
        platform: "cli",
        branch: {
          work: "agent/gamma/G1/G1.1/attempt-01",
          test: "test/gamma/G1/G1.1/attempt-01",
          review: "review/gamma/G1/G1.1"
        },
        validations: [
          { name: "unit-tests", tool: "npm test" }
        ],
        instructions: ["Run npm test"],
        notes: []
      };
      await writeJson(path.join(root, "data/tasks/tests/queued/gamma/G1.1.attempt-01.test-01.json"), payload);
      await writeJson(path.join(root, "data/state/assignment.log.json"), []);

      const queued = await listQueuedTestAssignments("gamma");
      expect(queued).toHaveLength(1);

      const result = await claimTestAssignment({ ideaId: "gamma" });
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.record.task_id).toBe("G1.1");
      expect(result.record.branch.test).toBe("test/gamma/G1/G1.1/attempt-01");
      await expect(fs.access(path.join(root, "data/tasks/tests/queued/gamma/G1.1.attempt-01.test-01.json"))).rejects.toThrow();
      await expect(fs.access(path.join(root, "data/tasks/tests/in-progress/gamma/G1.1.attempt-01.test-01.json"))).resolves.not.toThrow();
    });
  });

  it("completes test assignment successfully", async () => {
    await withTestAgentEnv(async ({ root, claimTestAssignment, completeTestAssignment }) => {
      const queuePayload = {
        idea_id: "delta",
        slice_id: "D1",
        task_id: "D1.2",
        source_attempt: 1,
        test_attempt: 1,
        assignment_type: "test",
        platform: "cli",
        model: "codex:cli",
        branch: { test: "test/delta/D1/D1.2/attempt-01" },
        validations: [{ name: "unit-tests", tool: "npm test" }]
      };
      await writeJson(path.join(root, "data/tasks/tests/queued/delta/D1.2.attempt-01.test-01.json"), queuePayload);
      await writeJson(path.join(root, "data/state/assignment.log.json"), []);

      const claim = await claimTestAssignment({ ideaId: "delta" });
      expect(claim).not.toBeNull();
      if (!claim) return;

      const result = await completeTestAssignment({
        ideaId: "delta",
        taskId: "D1.2",
        attempt: 1,
        testAttempt: 1,
        status: "success"
      });
      expect(result.dryRun).toBe(false);
      await expect(fs.access(path.join(root, "data/tasks/tests/in-progress/delta/D1.2.attempt-01.test-01.json"))).rejects.toThrow();
      const entries = JSON.parse(await fs.readFile(path.join(root, "data/state/assignment.log.json"), "utf8"));
      expect(entries).toHaveLength(1);
      expect(entries[0]).toMatchObject({ status: "completed", taskId: "D1.2#test" });
    });
  });

  it("requeues next test attempt on failure", async () => {
    await withTestAgentEnv(async ({ root, claimTestAssignment, completeTestAssignment }) => {
      const queuePayload = {
        idea_id: "epsilon",
        slice_id: "E1",
        task_id: "E1.3",
        source_attempt: 1,
        test_attempt: 1,
        assignment_type: "test",
        platform: "cli",
        branch: { test: "test/epsilon/E1/E1.3/attempt-01" },
        validations: [{ name: "lint", tool: "npm run lint" }]
      };
      await writeJson(path.join(root, "data/tasks/tests/queued/epsilon/E1.3.attempt-01.test-01.json"), queuePayload);
      await writeJson(path.join(root, "data/state/assignment.log.json"), []);

      await claimTestAssignment({ ideaId: "epsilon" });

      const result = await completeTestAssignment({
        ideaId: "epsilon",
        taskId: "E1.3",
        attempt: 1,
        testAttempt: 1,
        status: "failed",
        notes: "unit tests failing"
      });
      expect(result.requeued).toBe(true);
      const nextPath = path.join(
        root,
        "data/tasks/tests/queued/epsilon/E1.3.attempt-01.test-02.json"
      );
      await expect(fs.access(nextPath)).resolves.not.toThrow();
      const logEntries = JSON.parse(await fs.readFile(path.join(root, "data/state/assignment.log.json"), "utf8"));
      expect(logEntries).toHaveLength(1);
      expect(logEntries[0]).toMatchObject({ status: "failed", notes: "unit tests failing" });
    });
  });
});
