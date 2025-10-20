// runner.mjs
// Full orchestration simulation: Planner -> Executor -> Tester -> Supervisor

import { getExecutableTasks, executeTask } from "./executor_router.mjs";
import { runTests } from "./tester_agent.mjs";
import { validateTaskResult } from "./supervisor_agent.mjs";

async function main() {
  console.log("\n🧭 Vibeflow Orchestrator Runner — Phase 1 Simulation");

  const tasks = await getExecutableTasks();
  console.log(`\n${tasks.length} executable tasks ready.\n`);

  for (const task of tasks) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    const result = await executeTask(task);

    const testResult = await runTests(task);
    const validated = await validateTaskResult(task, result);

    console.log(`Summary for ${task.id}:`);
    console.log(`  • Tests: ${testResult.summary}`);
    console.log(`  • Validation: ${validated.status} (confidence ${validated.confidence})`);
  }

  console.log("\n✅ Simulation complete — Orchestrator flow verified.");
}

main();
