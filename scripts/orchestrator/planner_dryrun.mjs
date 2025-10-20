// planner_dryrun.mjs
// Reads data/tasks/tasks_dag_v3.json and prints the next executable tasks.

import fs from "node:fs/promises";
import path from "node:path";

const DAG_PATH = path.resolve("data/tasks/tasks_dag_v3.json");

async function main() {
  console.log("\n✅ Vibeflow Planner Dry Run");
  try {
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

    console.log(`\n${readyTasks.length} executable tasks found:\n`);
    readyTasks.slice(0, 3).forEach((task, i) => {
      console.log(`${i + 1}. [${task.slice}] ${task.id}: ${task.description}`);
    });
  } catch (err) {
    console.error("❌ Error reading DAG:", err.message);
  }
}

main();
