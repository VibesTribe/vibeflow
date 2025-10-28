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

export function runSkill(payload: Record<string, unknown>): Promise<unknown> {
  const skill = payload.skillId as string;
  if (!skill) {
    throw new Error("skillId is required");
  }
  const runner = `skills/${skill}.runner.mjs`;
  return new Promise((resolve, reject) => {
    const child = spawn("node", [runner], { stdio: ["pipe", "pipe", "inherit"] });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk) => chunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Skill runner exited with code ${code}`));
        return;
      }
      resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    });
  });
}
/* @endeditable */
