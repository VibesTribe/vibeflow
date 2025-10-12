import { promises as fs } from "fs";
import os from "os";
import path from "path";

async function withTempRoot(run: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "vibeflow-rate-limit-"));
  try {
    process.env.VIBEFLOW_ROOT = root;
    jest.resetModules();
    await run(root);
  } finally {
    delete process.env.VIBEFLOW_ROOT;
    await fs.rm(root, { recursive: true, force: true });
  }
}

describe("rateLimiter", () => {
  afterEach(async () => {
    const { clearRateLimitCaches } = await import("../src/telemetry/rateLimiter");
    const { clearRateLimitCache } = await import("../src/config/rateLimits");
    clearRateLimitCaches();
    clearRateLimitCache();
  });

  it("returns null when no rule exists", async () => {
    await withTempRoot(async () => {
      const { evaluateRateLimit } = await import("../src/telemetry/rateLimiter");
      const evaluation = await evaluateRateLimit("unknown-platform");
      expect(evaluation).toBeNull();
    });
  });

  it("blocks platform when assignments exceed threshold", async () => {
    await withTempRoot(async (root) => {
      const { evaluateRateLimit, isPlatformAllowed } = await import("../src/telemetry/rateLimiter");
      await fs.mkdir(path.join(root, "data", "policies"), { recursive: true });
      await fs.writeFile(
        path.join(root, "data", "policies", "rate_limits.json"),
        JSON.stringify(
          {
            platforms: [
              {
                id: "codex:cli",
                mode: "enforce",
                window_hours: 24,
                max_assignments: 1
              }
            ]
          },
          null,
          2
        ),
        "utf8"
      );

      const now = new Date().toISOString();
      await fs.mkdir(path.join(root, "data", "state"), { recursive: true });
      await fs.writeFile(
        path.join(root, "data", "state", "assignment.log.json"),
        JSON.stringify(
          [
            {
              taskId: "T1",
              attempt: 1,
              status: "assigned",
              platform: "codex:cli",
              timestamp: now
            }
          ],
          null,
          2
        ),
        "utf8"
      );

      const evaluation = await evaluateRateLimit("codex:cli");
      expect(evaluation?.status).toBe("exceeded");
      expect(evaluation?.reason).toBe("assignments");

      const availability = await isPlatformAllowed("codex:cli");
      expect(availability.allowed).toBe(false);
    });
  });
});
