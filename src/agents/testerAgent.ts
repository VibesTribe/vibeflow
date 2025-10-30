/**
 * vibeflow-meta:
 * id: src/agents/testerAgent.ts
 * task: REBUILD-V5
 * regions:
 *   - id: tester-agent
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:tester-agent */
import { spawn } from "child_process";
import path from "path";
import { TaskPacket } from "@core/types";
import { TaskState } from "@core/taskState";

const SKILLS_ROOT = path.resolve("skills");

export interface TesterInput {
  packet: TaskPacket;
  state: TaskState;
}

export interface TesterOutcome {
  status: "passed" | "failed" | "completed" | "dry_run" | "error";
  reason?: string;
  details?: unknown;
}

export class TesterAgent {
  async execute(input: TesterInput): Promise<TesterOutcome> {
    const results: TesterOutcome[] = [];

    // Static output validation
    results.push(await this.invokeRunner("validate_output", { artifact: input.state }));

    // Visual regression (optional)
    if (input.packet.metadata?.scenario) {
      results.push(
        await this.invokeRunner("run_visual_tests", {
          scenario: input.packet.metadata?.scenario,
        })
      );
    }

    return reduceOutcomes(results);
  }

  private invokeRunner(skillId: string, payload: Record<string, unknown>): Promise<TesterOutcome> {
    const runnerPath = path.resolve(SKILLS_ROOT, `${skillId}.runner.mjs`);

    return new Promise((resolve) => {
      const child = spawn("node", [runnerPath], { stdio: ["pipe", "pipe", "inherit"] });
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();

      const chunks: string[] = [];
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk) => chunks.push(chunk));

      child.on("error", (error) => {
        resolve({ status: "error", reason: error.message });
      });

      child.on("close", (code) => {
        if (code !== 0) {
          resolve({ status: "error", reason: `Skill ${skillId} exited with code ${code}` });
          return;
        }
        const output = chunks.join("");
        try {
          const parsed = output ? JSON.parse(output) : {};
          resolve(normalizeOutcome(parsed));
        } catch (error) {
          resolve({
            status: "error",
            reason: `Skill ${skillId} returned invalid JSON: ${(error as Error).message}`,
          });
        }
      });
    });
  }
}

function normalizeOutcome(value: unknown): TesterOutcome {
  if (!value || typeof value !== "object") {
    return { status: "error", reason: "Tester runner returned empty result" };
  }

  const status = (value as { status?: string }).status;
  if (status === "passed" || status === "completed") {
    return { status: "passed", details: value };
  }
  if (status === "failed") {
    return { status: "failed", details: value };
  }
  if (status === "dry_run") {
    return { status: "dry_run", details: value };
  }

  return {
    status: "error",
    reason: `Unexpected tester status: ${status ?? "unknown"}`,
    details: value,
  };
}

function reduceOutcomes(outcomes: TesterOutcome[]): TesterOutcome {
  if (outcomes.some((outcome) => outcome.status === "error")) {
    return outcomes.find((outcome) => outcome.status === "error")!;
  }
  if (outcomes.some((outcome) => outcome.status === "failed")) {
    return outcomes.find((outcome) => outcome.status === "failed")!;
  }
  if (outcomes.some((outcome) => outcome.status === "dry_run")) {
    return outcomes.find((outcome) => outcome.status === "dry_run")!;
  }
  return outcomes[0] ?? { status: "passed" };
}
/* @endeditable */
