#!/usr/bin/env node
export async function run(payload) {
  const artifact = payload?.artifact ?? {};
  const violations = [];
  if (!artifact.valid) {
    violations.push("Artifact flagged as invalid");
  }
  return {
    status: violations.length === 0 ? "passed" : "failed",
    violations,
  };
}
async function main() {
  if (process.argv.includes("--probe")) {
    console.log("validate_output ok");
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
