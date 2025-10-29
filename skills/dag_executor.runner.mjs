#!/usr/bin/env node

export async function run(payload) {
  const plan = payload?.plan ?? [];
  return {
    status: "completed",
    processed: plan.length,
    events: plan.map((task) => ({
      task_id: task.id,
      type: "status_change",
      details: { to: "in_progress" },
      timestamp: new Date().toISOString(),
    })),
  };
}

async function main() {
  if (process.argv.includes("--probe")) {
    console.log("dag_executor ok");
    return;
  }

  const stdin = await new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

  const payload = stdin ? JSON.parse(stdin) : {};
  const result = await run(payload);
  process.stdout.write(JSON.stringify(result));
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exit(1);
});
