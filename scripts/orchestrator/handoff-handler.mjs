import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const HANDOFF = path.join(ROOT, "data", "feedback", "handoffs");
const TASKS = path.join(ROOT, "data", "tasks");

async function loadJson(p){ try { return JSON.parse(await fs.readFile(p,"utf8")); } catch { return null; } }

function makePromptFromBrief(brief){
  return `HANDOFF BRIEF:\n- Progress: ${brief.summary?.progress||"n/a"}\n- Issues: ${(brief.summary?.issues||[]).join(", ")}\n- Next steps: ${(brief.summary?.nextSteps||[]).join("; ")}\n\nTASK: Continue from this state with a fresh chat. Produce EXACT output required by the task spec.`;
}

async function processHandoffs(){
  const files = await fs.readdir(HANDOFF).catch(()=>[]);
  let created = 0;
  for(const f of files){
    const brief = await loadJson(path.join(HANDOFF, f));
    if(!brief) continue;
    const slice = process.env.VF_SLICE_ID || "demo";
    const outDir = path.join(TASKS, slice);
    await fs.mkdir(outDir, { recursive: true });

    const task = {
      id: brief.newTask,
      sliceId: slice,
      title: `Handoff for ${brief.fromTask}`,
      expected: { codeType: "mixed", outputSpec: "Continue prior work with exact outputs per spec" },
      confidence: 0.96,
      deps: [],
      context: { repoQueries: [], code: [] },
      prompt: makePromptFromBrief(brief),
      platform: brief.recommendedPlatform || "gemini-web",
      status: "submitted"
    };

    const outPath = path.join(outDir, `${task.id}.json`);
    await fs.writeFile(outPath, JSON.stringify(task, null, 2));
    created++;
  }
  console.log(`Created ${created} handoff tasks.`);
}

processHandoffs();
