const fs = require("fs");
const path = require("path");

const ROOT = path.resolve("dashboard");
const STABLE = path.join(ROOT, "stable");
const MERGE_ROOT = path.join(ROOT, "merge");

const today = new Date().toISOString().split("T")[0];
const MERGE_OUT = path.join(MERGE_ROOT, today);
fs.mkdirSync(MERGE_OUT, { recursive: true });

const useFrom = {
  progressBar: "Cardview",
  header: "Cardview",
  dropdown: "Cardview",
  taskView: "Cardview"
};

function loadManifest(view) {
  const manifestPath = path.join(STABLE, view, "manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

for (const [component, view] of Object.entries(useFrom)) {
  const manifest = loadManifest(view);
  const comp = manifest.components[component] || manifest.components.baseLayout;
  if (!comp) continue;
  for (const [type, rel] of Object.entries(comp)) {
    const src = path.join(STABLE, view, rel);
    const dest = path.join(MERGE_OUT, rel);
    if (fs.existsSync(src)) copyFile(src, dest);
  }
}

console.log(`✅  Merged dashboard created at: ${MERGE_OUT}`);
