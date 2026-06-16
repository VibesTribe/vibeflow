import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Simplify: Vite builds directly to root dist.
// Remove nested workspace dist copying logic.
const repoRoot = path.resolve(__dirname, "..");
const npmCommand = "npm run build --workspace apps/dashboard";

const dashboardBuild = spawnSync(npmCommand, {
  cwd: repoRoot,
  stdio: "inherit",
  shell: true,
});

if (dashboardBuild.status !== 0) {
  process.exit(dashboardBuild.status ?? 1);
}

const rootDist = path.join(repoRoot, "dist");

// Copy static data assets
const dataState = path.join(repoRoot, "data", "state");
const dataMetrics = path.join(repoRoot, "data", "metrics");

function copyDirIfPresent(source, target) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

copyDirIfPresent(dataState, path.join(rootDist, "data", "state"));
copyDirIfPresent(dataMetrics, path.join(rootDist, "data", "metrics"));
