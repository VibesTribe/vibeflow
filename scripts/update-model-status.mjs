import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const EVENTS = path.join(ROOT, "data", "events");
const STATUS_DIR = path.join(ROOT, "data", "status", "models");

function colorFor(severity){
  switch(severity){
    case "error": return "#e74c3c";
    case "warn": return "#f1c40f";
    default: return "#2ecc71";
  }
}

async function loadJson(p, fb){ try { return JSON.parse(await fs.readFile(p,"utf8")); } catch { return fb; } }

async function updateStatusFile(evt){
  const platform = evt.platform || "unknown";
  const file = path.join(STATUS_DIR, `${platform}.json`);
  const now = new Date().toISOString();

  const record = await loadJson(file, { platform });
  record.platform = platform;
  record.status = evt.payload?.status || (evt.severity==="error"?"cooldown":(evt.severity==="warn"?"near_limit":"healthy"));
  record.severity = evt.severity || "info";
  record.last_message = evt.payload?.message || evt.payload?.reason || evt.type || "";
  record.color = colorFor(record.severity);
  record.last_updated = now;

  if (evt.payload?.retry_at) record.cooldown_until = evt.payload.retry_at;

  const history = record.history || [];
  history.push({ status: record.status, severity: record.severity, message: record.last_message, at: now });
  record.history = history.slice(-50);

  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(record, null, 2));
  console.log(`[status] Updated ${platform} -> ${record.status}`);
}

async function run(){
  const files = await fs.readdir(EVENTS).catch(()=>[]);
  for (const f of files){
    if(!f.endsWith(".json")) continue;
    const evt = await loadJson(path.join(EVENTS, f), null);
    if(!evt) continue;
    if(!["warn","error"].includes((evt.severity||"").toLowerCase())) continue;
    await updateStatusFile(evt);
  }
}

run();
