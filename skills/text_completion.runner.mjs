#!/usr/bin/env node
export async function run(payload) {
  const prompt = payload?.prompt ?? "";
  return {
    status: "completed",
    completion: `${prompt} :: synthesized response`,
  };
}
async function main() {
  if (process.argv.includes("--probe")) {
    console.log("text_completion ok");
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
