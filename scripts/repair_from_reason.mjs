#!/usr/bin/env node

const REPAIR_MAP = {
  "E/MISSING_DEP": {
    title: "Install missing dependency",
    checklist: ["Identify package", "Run npm install", "Update lockfile"],
  },
  "E/SCHEMA_INVALID": {
    title: "Fix schema violations",
    checklist: ["Run npm run validate:schemas", "Patch offending file", "Re-run checks"],
  },
  "E/SELECTOR_CHANGED": {
    title: "Update visual selectors",
    checklist: ["Capture new DOM", "Update visual runner", "Record ok-probe"],
  },
};

const reason = process.argv[2];
if (!reason) {
  console.error("Usage: node scripts/repair_from_reason.mjs <reason_code>");
  process.exit(1);
}

const repair = REPAIR_MAP[reason];
if (!repair) {
  console.error(`No repair recipe for ${reason}`);
  process.exit(1);
}

console.log(JSON.stringify({ reason, repair }, null, 2));
