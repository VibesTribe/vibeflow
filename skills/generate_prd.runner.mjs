#!/usr/bin/env node
export async function run(payload) {
  const research = payload?.research_packet ?? {};
  return {
    status: "completed",
    prd_slice: {
      title: research.title ?? "Untitled",
      requirements: research.requirements ?? [],
      acceptance_criteria: research.acceptance_criteria ?? [],
    },
  };
}
async function main() {
  if (process.argv.includes("--probe")) {
    console.log("generate_prd ok");
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
