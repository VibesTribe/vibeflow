import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const HANDOFF_DIR = path.join(ROOT, "data", "feedback", "handoffs");
const EVENTS_DIR = path.join(ROOT, "data", "events");
await fs.mkdir(HANDOFF_DIR, { recursive: true }).catch(()=>{});
await fs.mkdir(EVENTS_DIR, { recursive: true }).catch(()=>{});

function classify(text){
  const t = (text||"").toLowerCase();
  if (t.includes("rate limit") || t.includes("quota") || t.includes("try again")) return "limit_hit";
  if (t.includes("still working") || (t.match(/\bretrying\b/g)||[]).length > 3) return "loop_detected";
  if (t.includes("explaining") && t.includes("instead of code")) return "context_drift";
  return null;
}

function parseRetry(text){
  const t = (text||"").toLowerCase();
  const m = t.match(/(\d+)\s*(seconds|minutes|hours|days)/);
  if(!m) return null;
  const scale = { seconds:1, minutes:60, hours:3600, days:86400 }[m[2]] || 1;
  const sec = parseInt(m[1],10)*scale;
  return { retry_after_s: sec, retry_at: new Date(Date.now()+sec*1000).toISOString() };
}

export async function runWatcher(sampleLogPath){
  const content = await fs.readFile(sampleLogPath, "utf8").catch(()=> "");
  const reason = classify(content);
  if(!reason){ console.log("[watcher] no issues detected"); return { status:"ok" }; }

  const meta = { reason, ...parseRetry(content) };
  const brief = {
    fromTask: process.env.VF_TASK_ID || "unknown",
    newTask: (process.env.VF_TASK_ID||"unknown") + "-handoff",
    reason,
    summary: { progress: "unknown", issues: [reason], nextSteps: ["start clean chat with this brief"] },
    recommendedPlatform: process.env.VF_ALT_PLATFORM || "",
    createdAt: new Date().toISOString()
  };

  const handoffFile = path.join(HANDOFF_DIR, `${brief.newTask}.json`);
  await fs.writeFile(handoffFile, JSON.stringify(brief, null, 2));

  const evt = {
    type: reason === "limit_hit" ? "platform.limit" : "task.handoff",
    task_id: brief.fromTask, slice_id: process.env.VF_SLICE_ID || "unknown",
    platform: process.env.VF_PLATFORM || "", severity: reason==="limit_hit"?"warn":"info",
    payload: { ...meta, handoff: brief.newTask }
  };
  const evtFile = path.join(EVENTS_DIR, `evt-${Date.now()}.json`);
  await fs.writeFile(evtFile, JSON.stringify(evt, null, 2));

  console.log("[watcher] wrote handoff + event", handoffFile, evtFile);
  return { status:"issue", reason, handoff: handoffFile, event: evtFile };
}

if (process.argv[1] === (fileURLToPath(import.meta.url))) {
  const sample = process.env.VF_SAMPLE_LOG || "README.md";
  runWatcher(sample).then(x => { if(x.status==="issue") process.exit(1); else process.exit(0); });
}
