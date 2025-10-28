#!/usr/bin/env node
export async function run(payload) {
  const scenario = payload?.scenario ?? "default";
  return {
    status: "completed",
    report: {
      scenario,
      screenshots: [`screenshots/${scenario}.png`],
    },
  };
}
async function main() {
  if (process.argv.includes("--probe")) {
    console.log("run_visual_tests ok");
    return;
  }
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", async () => {
    const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
    const result = await run(payload);
    process.stdout.write(JSON.stringify(result));
  });
}
main();
