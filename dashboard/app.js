const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n||0);
const qs=s=>document.querySelector(s);
async function fetchJSON(p){
  try{const r=await fetch(p,{cache:'no-store'}); if(!r.ok) throw new Error(p+': '+r.status); return await r.json();}
  catch(e){console.warn('fetchJSON failed',p,e); return null;}
}
async function init(){
  const taskState=await fetchJSON('../state/task.state.json');
  const openspec=await fetchJSON('../state/openspec.index.json');
  const snapshot=await fetchJSON('../reports/repo-snapshot.json');

  const t=taskState?.stats?.totals||{};
  qs('#tasks_total').textContent=fmt(t.tasks);
  qs('#tasks_done').textContent=fmt(t.completed);
  qs('#tasks_running').textContent=fmt(t.running);
  qs('#tasks_queued').textContent=fmt(t.queued);

  const list=qs('#openspec_changes'); list.innerHTML='';
  (openspec?.changes||[]).slice(0,15).forEach(c=>{
    const li=document.createElement('li');
    const a=document.createElement('a');
    a.href=`../../${c.path}`;
    a.textContent=`${c.title} — ${c.summary}`;
    li.appendChild(a);
    list.appendChild(li);
  });
  if(!list.children.length) list.innerHTML='<li>(none indexed yet)</li>';

  const rf=qs('#recent_files'); rf.innerHTML='';
  (snapshot?.files||[]).slice(0,30).forEach(f=>{
    const li=document.createElement('li');
    li.textContent=`${f.path} (size ${fmt(f.size)})`;
    rf.appendChild(li);
  });
  if(!rf.children.length) rf.innerHTML='<li>(snapshot empty)</li>';

  const linkDiv=document.getElementById('handoff_link'); linkDiv.innerHTML='';
  const a=document.createElement('a'); a.href='../updates/INDEX.md'; a.textContent='Open Handoff Index';
  linkDiv.appendChild(a);
}
init();
