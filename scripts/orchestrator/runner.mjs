// runner.mjs
// Full orchestration simulation: Planner -> Executor -> Tester -> Supervisor + Telemetry

import { getExecutableTasks, executeTask } from "./executor_router.mjs";
import { runTests } from "./tester_agent.mjs";
import { validateTaskResult } from "./supervisor_agent.mjs";
import { writeTelemetry } from "../telemetry/telemetry_writer.mjs";

async function main() {
  console.log("\n🧭 Vibeflow Orchestrator Runner — Phase 2 (Telemetry Enabled)");

  const tasks = await getExecutableTasks();
  console.log(`\n${tasks.length} executable tasks ready.\n`);

  for (const task of tasks) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    const result = await executeTask(task);

    const testResult = await runTests(task);
    const validated = await validateTaskResult(task, result);

    const summaryText = `${testResult.summary}; Validation ${validated.status} (confidence ${validated.confidence})`;

    console.log(`Summary for ${task.id}:`);
    console.log(`  • Tests: ${testResult.summary}`);
    console.log(`  • Validation: ${validated.status} (confidence ${validated.confidence})`);

    // 🧩 Phase 2 addition — write telemetry after each task
    await writeTelemetry({
      task_id: task.id,
      status: validated.status,
      confidence: validated.confidence,
      summary: summaryText,
      cost: result?.cost ?? 0,
      latency: result?.latency ?? 0,
    });
  }

  console.log("\n✅ Simulation complete — Orchestrator flow + Telemetry verified.");
}

main();
