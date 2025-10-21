#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const DIST_DIR = path.join(process.cwd(), "dist");
const SNAPSHOT_SRC = path.join(process.cwd(), ".snapshots");
const PUBLIC_BASE_PATH = normalizeBase(process.env.PUBLIC_BASE_PATH ?? "/vibeflow");

function normalizeBase(input) {
  if (!input || input === "/") return "";
  return input.startsWith("/") ? input.replace(/\/?$/, "") : `/${input.replace(/\/?$/, "")}`;
}

function applyBase(url) {
  if (!url) return url;
  const base = PUBLIC_BASE_PATH;
  if (!base) return url;
  if (!url.startsWith("/")) return `${base}/${url}`;
  return `${base}${url}`;
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function rewriteManifest(manifestPath) {
  try {
    const data = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    if (Array.isArray(data.snapshots)) {
      for (const entry of data.snapshots) {
        if (entry.indexPath) entry.indexPath = applyBase(entry.indexPath);
        if (entry.thumbnailPath) entry.thumbnailPath = applyBase(entry.thumbnailPath);
      }
    }
    data.generatedAt = new Date().toISOString();
    await fs.writeFile(manifestPath, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.warn(`Unable to rewrite manifest at ${manifestPath}`, error);
  }
}

async function main() {
  if (!(await pathExists(SNAPSHOT_SRC))) {
    console.log("No snapshots to copy.");
    return;
  }

  const dest = path.join(DIST_DIR, ".snapshots");
  await fs.rm(dest, { recursive: true, force: true });
  await fs.cp(SNAPSHOT_SRC, dest, { recursive: true });

  const manifestPath = path.join(dest, "dashboard", "manifest.json");
  if (await pathExists(manifestPath)) {
    await rewriteManifest(manifestPath);
    console.log("Copied snapshots and rewrote manifest for public base path.");
  } else {
    console.log("Snapshots copied; no manifest found to rewrite.");
  }
}

main().catch((error) => {
  console.error("Failed to copy snapshots into dist.", error);
  process.exit(1);
});
