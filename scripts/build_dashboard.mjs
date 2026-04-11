import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

const workspaceDist = path.join(repoRoot, "apps", "dashboard", "dist");
const rootDist = path.join(repoRoot, "dist");
const workspaceDistExists = fs.existsSync(workspaceDist);
const buildOutputExists = workspaceDistExists || fs.existsSync(rootDist);

if (!buildOutputExists) {
  console.error("[build-dashboard] Build output missing. Did Vite build fail?");
  process.exit(1);
}

/** Copies a directory recursively if it exists. */
function copyDirIfPresent(source, target) {
  if (!fs.existsSync(source)) {
    return;
  }
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
}

if (workspaceDistExists) {
  fs.rmSync(rootDist, { recursive: true, force: true });
  fs.mkdirSync(rootDist, { recursive: true });
  fs.cpSync(workspaceDist, rootDist, { recursive: true });
} else {
  fs.mkdirSync(rootDist, { recursive: true });
}

const dataState = path.join(repoRoot, "data", "state");
const dataMetrics = path.join(repoRoot, "data", "metrics");

copyDirIfPresent(dataState, path.join(rootDist, "data", "state"));
copyDirIfPresent(dataMetrics, path.join(rootDist, "data", "metrics"));
