// executor_router.mjs
// Simulates routing and executing DAG tasks based on orchestrator.config.json

import fs from "node:fs/promises";
import path from "node:path";

const CONFIG_PATH = path.resolve("scripts/orchestrator/orchestrator.config.json");
const DAG_PATH = path.resolve("data/tasks/tasks_dag_v3.json");

export async function executeTask(task) {
  const config = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));
  const env = config.environments[task.slice] || { adapter: "local", model: "generic" };

  console.log(`\n🚀 Executing [${task.slice}] ${task.id}: ${task.description}`);
  console.log(`→ Environment: ${env.adapter} | Model: ${env.model}`);

  // Simulated execution delay
  await new Promise(r => setTimeout(r, 500));

  // Fake output result
  const result = {
    output: `Simulated result for ${task.id}`,
    quality: 0.85 + Math.random() * 0.15
  };

  console.log("🧩 Execution complete. Returning simulated result...");
  return result;
}

export async function getExecutableTasks() {
  const raw = await fs.readFile(DAG_PATH, "utf8");
  const dag = JSON.parse(raw);
  const readyTasks = [];

  for (const slice of dag) {
    if (["in_progress", "planned"].includes(slice.status)) {
      for (const t of slice.tasks) {
        if (["planned", "in_progress"].includes(t.status)) {
          const depsDone = (t.depends_on || []).every(depId =>
            dag.some(s => s.tasks.some(tt => tt.id === depId && tt.status === "done"))
          );
          if (depsDone) readyTasks.push({ slice: slice.slice, ...t });
        }
      }
    }
  }
  return readyTasks.slice(0, 3);
}
