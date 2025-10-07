import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FEEDBACK_DIR = path.join(ROOT, "data", "feedback", "reassignments");

export async function logReassignment(taskId, sliceId, reason, platform = "") {
  await fs.mkdir(FEEDBACK_DIR, { recursive: true });
  const record = {
    taskId,
    sliceId,
    reason,
    platform,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  const filePath = path.join(FEEDBACK_DIR, `${taskId}.json`);
  await fs.writeFile(filePath, JSON.stringify(record, null, 2));
  console.log(`[reassign-log] Logged ${taskId} (${sliceId}) → ${filePath}`);
}

// Run automatically in GitHub Action context
if (process.env.GITHUB_EVENT_PATH) {
  try {
    const event = JSON.parse(await fs.readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
    const pr = event.pull_request;
    const title = pr?.title || "";
    const match = title.match(/Task:\s*([\w\-.]+)/);
    const taskId = match ? match[1] : pr?.head?.ref?.split("/").pop() || "unknown";
    const sliceId = pr?.head?.ref?.split("/")[1] || "unknown";
    const reason = "Supervisor flagged for reassignment.";
    await logReassignment(taskId, sliceId, reason);
  } catch (err) {
    console.error("Error writing reassignment log:", err);
  }
}
