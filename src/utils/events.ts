export async function emitEvent({ type, task_id = "", slice_id = "", platform = "", model = "", severity = "info", payload = {} } : any){
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if(!url || !key){ console.log("[events] Missing Supabase env; skipping emit", {type}); return; }
  const body = [{ type, task_id, slice_id, platform, model, severity, payload }];
  await fetch(`${url}/rest/v1/v_events`, {
    method: 'POST',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
    body: JSON.stringify(body)
  }).catch(e => console.error("emitEvent error", e));
}
