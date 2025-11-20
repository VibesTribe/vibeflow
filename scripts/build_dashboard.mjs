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

if (fs.existsSync(workspaceDist)) {
  fs.rmSync(rootDist, { recursive: true, force: true });
  fs.mkdirSync(rootDist, { recursive: true });
  fs.cpSync(workspaceDist, rootDist, { recursive: true });
}
