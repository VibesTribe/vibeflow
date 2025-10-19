import fs from "fs";
import path from "path";

const ROOT = path.resolve("dashboard");
const STABLE = path.join(ROOT, "stable");
const MERGE_ROOT = path.join(ROOT, "merge");

const today = new Date().toISOString().split("T")[0];
const MERGE_OUT = path.join(MERGE_ROOT, today);
fs.mkdirSync(MERGE_OUT, { recursive: true });

const useFrom = {
  progressBar: "CardView",
  header: "ModelView",
  dropdown: "CardView",
  taskView: "ROIView"
};

const loadManifest = (view) =>
  JSON.parse(fs.readFileSync(path.join(STABLE, view, "manifest.json"), "utf8"));

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

for (const [component, view] of Object.entries(useFrom)) {
  const manifest = loadManifest(view);
  const comp = manifest.components[component];
  if (!comp) continue;
  for (const [type, rel] of Object.entries(comp)) {
    const src = path.join(STABLE, view, rel);
    const dest = path.join(MERGE_OUT, rel);
    if (fs.existsSync(src)) copyFile(src, dest);
  }
}

console.log(`✅  Merged dashboard created at: ${MERGE_OUT}`);
