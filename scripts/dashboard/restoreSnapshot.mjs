/**
 * Vibeflow Dashboard Snapshot Restorer
 * ------------------------------------
 * Usage:
 *   node scripts/dashboard/restoreSnapshot.mjs 2025-10-20_14-30
 *
 * Restores the snapshot from .snapshots/dashboard/<timestamp>/
 * back into dashboard/stable/.
 */

import fs from "fs";
import path from "path";

const SNAP_DIR = ".snapshots/dashboard";
const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/dashboard/restoreSnapshot.mjs <snapshot-folder>");
  process.exit(1);
}

const src = path.join(SNAP_DIR, target);
const dest = "dashboard/stable";

if (!fs.existsSync(src)) {
  console.error(`❌ Snapshot ${target} not found in ${SNAP_DIR}`);
  process.exit(1);
}

console.log(`Restoring snapshot: ${target}`);
fs.cpSync(src, dest, { recursive: true });
console.log(`✅ Restored ${target} → dashboard/stable`);
