const fs = require("fs");
const path = require("path");

const ROOT = path.resolve("dashboard");
const STABLE = path.join(ROOT, "stable");
const MERGE_ROOT = path.join(ROOT, "merge");
const today = new Date().toISOString().split("T")[0];
const MERGE_OUT = path.join(MERGE_ROOT, today);

fs.mkdirSync(MERGE_OUT, { recursive: true });

const stableViews = fs.readdirSync(STABLE).filter(f => {
  const manifest = path.join(STABLE, f, "manifest.json");
  return fs.existsSync(manifest);
});

console.log("Detected stable views:", stableViews.join(", "));

for (const view of stableViews) {
  const manifestPath = path.join(STABLE, view, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const comp = manifest.components.baseLayout;
  for (const [type, rel] of Object.entries(comp)) {
    const src = path.join(STABLE, view, rel);
    const dest = path.join(MERGE_OUT, view, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log(`✅ Auto-merged all detected dashboards into: ${MERGE_OUT}`);
