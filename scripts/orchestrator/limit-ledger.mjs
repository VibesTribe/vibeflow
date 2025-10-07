import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const LEDGER_FILE = path.join(ROOT, "data", "cache", "usage-ledger.json");
const REGISTRY = path.join(ROOT, "data", "models", "registry.json");
const EVENTS_DIR = path.join(ROOT, "data", "events");

async function loadJson(p, fb){ try{ return JSON.parse(await fs.readFile(p,"utf8")); }catch{ return fb; } }
async function saveJson(p, obj){ await fs.mkdir(path.dirname(p), {recursive:true}); await fs.writeFile(p, JSON.stringify(obj, null, 2)); }
function now(){ return Date.now(); }

function statusFrom(used, soft, hard){
  if (hard && used >= hard) return "cooldown";
  if (soft && used >= Math.max(1, soft-1)) return "near_limit";
  return "healthy";
}

async function updateStatus(){
  const registry = await loadJson(REGISTRY, { platforms: {} });
  const ledger = await loadJson(LEDGER_FILE, {});
  await fs.mkdir(EVENTS_DIR, { recursive: true }).catch(()=>{});

  for(const [key, meta] of Object.entries(registry.platforms||{})){
    const window_s = meta.window_s || 60;
    const soft = meta.soft_rpm || 0;
    const hard = meta.rpm || 0;

    const times = (ledger[key]?.times||[]).filter(ts => (now()-ts) < window_s*1000);
    ledger[key] = { ...(ledger[key]||{}), times };
    const used = times.length;
    const status = statusFrom(used, soft, hard);

    const evt = {
      type: "model.status",
      platform: key,
      severity: status === "cooldown" ? "error" : (status === "near_limit" ? "warn" : "info"),
      payload: { used_rpm: used, soft_rpm: soft, hard_rpm: hard, window_s },
      timestamp: new Date().toISOString()
    };
    await fs.writeFile(path.join(EVENTS_DIR, `modelstatus-${key}-${now()}.json`), JSON.stringify(evt, null, 2));
  }

  await saveJson(LEDGER_FILE, ledger);
  console.log("Updated model status");
}
updateStatus();
