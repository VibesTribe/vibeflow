#!/usr/bin/env node
import { exec } from "child_process";
export async function run(payload) {
  const command = payload?.command;
  if (!command) {
    throw new Error("cli_exec requires command");
  }
  return new Promise((resolve, reject) => {
    exec(command, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ status: "completed", stdout, stderr });
    });
  });
}
async function main() {
  if (process.argv.includes("--probe")) {
    console.log("cli_exec ok");
    return;
  }
  const chunks = [];
  process.stdin.on("data", (chunk) => chunks.push(chunk));
  process.stdin.on("end", async () => {
    try {
      const payload = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
      const result = await run(payload);
      process.stdout.write(JSON.stringify(result));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });
}
main();
