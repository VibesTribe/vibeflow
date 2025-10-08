// scripts/propose-next-plan.mjs
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const STATE_FILE = path.join(ROOT, "data", "state", "task.state.json");
const NEXT_PLAN = path.join(ROOT, "data", "tasks", "next_plan.json");

async function maybeRead(p, fallback=null){
  try { return JSON.parse(await fs.readFile(p,"utf8")); } catch { return fallback; }
}

async function main(){
  const state = await maybeRead(STATE_FILE, { tasks:[] });
  const unfinished = (state.tasks || []).filter(t => t.status !== "done");
  const date = new Date().toISOString().slice(0,10);

  const next = {
    context_snapshot_id: state.context_snapshot_id || "sha256(latest)",
    generated_at: new Date().toISOString(),
    slices: [
      {
        slice_id: `NEXT-${date}`,
        name: "Carryover & Priority",
        goal: "Complete carryover tasks; prioritize routing/data-plane foundations.",
        tasks: unfinished.map(t => ({
          task_id: t.task_id,
          task_type: t.task_type || "code",
          domain_tag: t.domain_tag || "general",
          contract: { title: t.title || "" },
          confidence: t.confidence || 0.9,
          depends_on: t.depends_on || []
        }))
      }
    ],
    open_questions: [],
    echo_check: "Carry over unfinished tasks, preserve dependencies, ready for orchestrator."
  };

  await fs.mkdir(path.dirname(NEXT_PLAN), { recursive: true });
  await fs.writeFile(NEXT_PLAN, JSON.stringify(next, null, 2), "utf8");
  console.log("Wrote", NEXT_PLAN);
}

main().catch(err => { console.error(err); process.exit(1); });
