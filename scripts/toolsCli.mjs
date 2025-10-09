// scripts/toolsCli.mjs
// Usage: node scripts/toolsCli.mjs --tool OpenSpecWriter@v1 --args '{"slug":"dashboard-openspec-panel","title":"Add OpenSpec Panel","rationale":"Expose top changes on dashboard.","acceptance_criteria":["List top 10","Link to source"]}'
import fs from "node:fs/promises";
import path from "node:path";

const argv = Object.fromEntries(process.argv.slice(2).map((v, i, a) => v.startsWith("--") ? [v.slice(2), a[i+1]] : []));
const TOOL = argv.tool || process.env.TOOL;
const ARGS = argv.args || process.env.ARGS;

if (!TOOL || !ARGS) { console.error("Required: --tool <name> --args '<json>'"); process.exit(1); }

async function runOpenSpecWriter(args){
  const root = process.cwd();
  const file = path.join(root, "openspec", "changes", `${args.slug}.md`);
  const header = `# ${args.title}\n\n${args.rationale}\n\n## Acceptance Criteria\n` + (args.acceptance_criteria||[]).map(x=>`- ${x}`).join("\n") + "\n";
  let updated = false;
  try { await fs.stat(file); updated = true; } catch {}
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, header, "utf8");
  return { path: path.relative(root, file), updated };
}

const args = JSON.parse(ARGS);
let result;
if (TOOL === "OpenSpecWriter@v1") result = await runOpenSpecWriter(args);
else { console.error("Unknown tool"); process.exit(1); }

console.log(JSON.stringify({ ok:true, result }, null, 2));
