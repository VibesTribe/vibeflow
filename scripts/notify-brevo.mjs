import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const EVENTS_DIR = path.join(ROOT, "data", "events");
const CONFIG = path.join(ROOT, "config", "alerts.providers.json");

function isCreditEvent(evt){
  const t = (evt.type || "").toLowerCase();
  const sev = (evt.severity || "").toLowerCase();
  const msg = (evt.payload?.message || JSON.stringify(evt.payload||{})).toLowerCase();
  if (t.includes("credit") || t.includes("auth_error")) return true;
  if (t.includes("platform.limit") || t.includes("model.status")) {
    return /(quota|limit|credit|exceed|exceeded|cooldown)/.test(msg) || sev === "error";
  }
  return false;
}

function normalizePlatform(p){ return String(p||"").toLowerCase(); }

function providerIsPaid(platform, cfg){
  const p = normalizePlatform(platform);
  for (const [key, meta] of Object.entries(cfg.providers||{})){
    const aliases = (meta.aliases||[]).map(a => a.toLowerCase());
    if (p === key || aliases.includes(p)) return !!meta.paid;
  }
  return false;
}

async function sendEmail({subject, html, text}){
  const key = process.env.BREVO_API_KEY;
  const fromEmail = process.env.BREVO_FROM_EMAIL;
  const fromName  = process.env.BREVO_FROM_NAME || "Vibeflow Alerts";
  const to        = process.env.BREVO_TO;
  if(!key || !fromEmail || !to){
    console.log("[brevo] Missing secrets; skipping email.");
    return;
  }
  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: to.split(",").map(e => ({ email: e.trim() })).filter(x => x.email),
    subject, htmlContent: html, textContent: text || ""
  };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "accept":"application/json", "api-key": key, "content-type":"application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok){
    console.error("[brevo] send failed", await res.text());
  } else {
    console.log("[brevo] alert sent:", subject);
  }
}

function renderEmail(evt){
  const platform = evt.platform || "unknown";
  const title = (evt.type || "Vibeflow Alert").replace(/\./g, " · ");
  const sevIcon = (evt.severity||"info") === "error" ? "🚨" : "⚠️";
  const subject = `[Vibeflow] ${sevIcon} ${platform} ${title}`;
  const pretty = JSON.stringify(evt.payload || {}, null, 2);
  const html = `
    <h2>Vibeflow API Credit/Quota Alert</h2>
    <p><strong>Platform:</strong> ${platform}</p>
    <p><strong>Type:</strong> ${evt.type}</p>
    <p><strong>Severity:</strong> ${evt.severity||"info"}</p>
    <pre style="background:#0b1020;color:#e6f1ff;padding:12px;border-radius:8px;white-space:pre-wrap;">${pretty}</pre>
    <hr/>
    <p style="font-size:12px;color:#888">Task: ${evt.task_id||""} • Slice: ${evt.slice_id||""} • ${new Date().toISOString()}</p>
  `;
  const text = `Platform: ${platform}\nType: ${evt.type}\nSeverity: ${evt.severity||"info"}\nPayload: ${pretty}`;
  return { subject, html, text };
}

async function run(){
  const cfg = JSON.parse(await fs.readFile(CONFIG, "utf8").catch(()=>"{\"providers\":{}}"));
  const files = await fs.readdir(EVENTS_DIR).catch(()=>[]);
  if (!files.length){ console.log("[alerts] no events"); return; }

  for (const f of files){
    if (!f.endsWith(".json")) continue;
    const evt = JSON.parse(await fs.readFile(path.join(EVENTS_DIR, f), "utf8").catch(()=> "null"));
    if (!evt || typeof evt !== "object") continue;

    const paid = providerIsPaid(evt.platform, cfg);
    if (!paid) { continue; }

    if (!isCreditEvent(evt)) { continue; }

    const { subject, html, text } = renderEmail(evt);
    await sendEmail({ subject, html, text });
  }
}

run();
