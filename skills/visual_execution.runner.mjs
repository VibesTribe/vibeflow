#!/usr/bin/env node
export async function run(payload) {
  return {
    status: "completed",
    artifacts: payload?.scenarios?.map((scenario) => ({
      scenario,
      screenshot: `screenshots/${scenario}.png`,
    })) ?? [],
  };
}
async function main() {
  if (process.argv.includes("--probe")) {
    console.log("visual_execution ok");
    return;
  }
  const data = await new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
  const payload = data ? JSON.parse(data) : {};
  const result = await run(payload);
  process.stdout.write(JSON.stringify(result));
}
main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
