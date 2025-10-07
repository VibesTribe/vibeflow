import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const EVENTS = path.join(ROOT, "data", "events");

async function post(evts){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if(!url || !key){ console.log("Missing Supabase env; skipping post"); return; }
  const rows = evts.map(e => ({
    type: e.type, task_id: e.task_id||"", slice_id: e.slice_id||"",
    platform: e.platform||"", model: e.model||"", severity: e.severity||"info",
    payload: e.payload||{}
  }));
  const res = await fetch(`${url}/rest/v1/v_events`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(rows)
  });
  if(!res.ok){ console.error("Supabase post failed", await res.text()); }
}

async function run(){
  const files = await fs.readdir(EVENTS).catch(()=>[]);
  const evts = [];
  for(const f of files){
    if(!f.endsWith(".json")) continue;
    const e = JSON.parse(await fs.readFile(path.join(EVENTS,f), "utf8"));
    evts.push(e);
  }
  if(evts.length){ await post(evts); }
  console.log("Bridged events:", evts.length);
}
run();
