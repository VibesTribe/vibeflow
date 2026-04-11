/**
 * vibeflow-meta:
 * id: src/mcp/tools/runSkill.ts
 * task: REBUILD-V5
 * regions:
 *   - id: mcp-run-skill
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:mcp-run-skill */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const SKILL_PATTERN = /^[a-zA-Z0-9_-]+$/;
const SKILLS_ROOT = path.resolve("skills");

function resolveRunnerPath(rawSkillId: unknown): string {
  if (typeof rawSkillId !== "string" || rawSkillId.trim().length === 0) {
    throw new Error("skillId is required");
  }
  if (!SKILL_PATTERN.test(rawSkillId)) {
    throw new Error("skillId contains invalid characters");
  }

  const runnerPath = path.resolve(SKILLS_ROOT, `${rawSkillId}.runner.mjs`);
  if (!runnerPath.startsWith(SKILLS_ROOT + path.sep)) {
    throw new Error("Resolved runner path is outside the skills directory");
  }
  if (!fs.existsSync(runnerPath)) {
    throw new Error(`Skill runner not found for ${rawSkillId}`);
  }
  return runnerPath;
}

export function runSkill(payload: Record<string, unknown>): Promise<unknown> {
  const runner = resolveRunnerPath(payload.skillId);
  return new Promise((resolve, reject) => {
    const child = spawn("node", [runner], { stdio: ["pipe", "pipe", "inherit"] });
    child.stdout.setEncoding("utf8");
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();

    const chunks: string[] = [];
    child.stdout.on("data", (chunk) => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf8"));
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Skill runner exited with code ${code}`));
        return;
      }

      const output = chunks.join("");
      try {
        resolve(output.length ? JSON.parse(output) : null);
      } catch (error) {
        reject(new Error(`Skill runner returned invalid JSON: ${(error as Error).message}`));
      }
    });
  });
}
/* @endeditable */
