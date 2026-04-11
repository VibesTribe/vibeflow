import React, { useEffect, useMemo, useState } from "react";

/**
 * Vibeflow Dashboard Canvas — fully restored, scrollable center, thin dark scrollbars
 * - Restores SliceDock, AgentHangar, modals (Docs/Add/ROI/Logs, Agent/Slice)
 * - Keeps compact SliceHub (~33% smaller) + top-label nudge to avoid overlap
 * - Sticky header with Vibes orb, Pac‑Man tokens button (with "tokens")
 * - Left/Right docks scroll; center grid scrolls independently
 */

// ---------- Utilities ----------
function pct(done = 0, total = 0) {
  if (!total || total <= 0) return 0;
  const p = Math.round((done / total) * 100);
  return Math.max(0, Math.min(100, p));
}

function dashForPercent(percent, r) {
  const C = 2 * Math.PI * r;
  const filled = (percent / 100) * C;
  return `${filled} ${C}`;
}

// ---------- Custom Scrollbar (dark track, thin white thumb) ----------
const scrollbarStyles = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: #ffffff; border-radius: 3px; }
  ::-webkit-scrollbar-track { background: #000000; }
`;

// ---------- Badge Styles (backgrounds only remapped) ----------
const BADGE_STYLES = {
  W: { bg: "bg-blue-900", border: "border-blue-400", text: "text-blue-200" },
  M: { bg: "bg-purple-900", border: "border-purple-400", text: "text-purple-200" },
  Q: { bg: "bg-amber-900", border: "border-amber-400", text: "text-amber-200" },
  default: { bg: "bg-slate-900", border: "border-cyan-400", text: "text-cyan-200" },
};

const AgentBadge = ({ tier, size = "normal" }) => {
  const style = BADGE_STYLES[tier] || BADGE_STYLES.default;
  const textSize = size === "large" ? "text-[8px]" : "text-[5px]";
  const padding = size === "large" ? "px-[4px]" : "px-[2px]";
  return (
    <span className={`absolute bottom-[1px] left-1/2 -translate-x-1/2 ${textSize} ${style.bg} ${style.text} rounded-full ${padding} leading-none border ${style.border} shadow-sm`}>{tier}</span>
  );
};

// ---------- Docks ----------
const SliceDock = ({ slices, onSliceClick, onDocsClick }) => (
  <aside className="fixed left-0 top-0 h-full w-24 border-r border-slate-700/40 bg-slate-900 px-2 pt-0 pb-2 flex flex-col items-center gap-3 overflow-y-auto z-10">
    <div className="sticky top-0 w-full bg-slate-900 pt-3 pb-1 z-20"><div className="flex flex-col items-center"><button onClick={onDocsClick} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">Docs</button><h2 className="text-[9px] text-slate-400 mt-1">SLICE DOCK</h2></div></div>
    {slices.map((s) => {
      const r = 40;
      const p = pct(s.tasksDone, s.tasksTotal);
      const dash = dashForPercent(p, r);
      const isComplete = s.tasksDone >= s.tasksTotal && s.tasksTotal > 0;
      const notStarted = (s.tasksDone || 0) === 0;
      return (
        <button key={s.id} onClick={() => onSliceClick?.(s)} className="relative flex flex-col items-center hover:opacity-90 active:scale-[0.98] transition">
          <svg viewBox="0 0 100 100" className="w-16 h-16">
            <circle cx="50" cy="50" r={r} stroke="#122033" strokeWidth="6" fill={isComplete ? "#10b981" : "none"} />
            {!isComplete && (notStarted ? (
              <circle cx="50" cy="50" r={r} stroke="#475569" strokeWidth="6" fill="none" />
            ) : (
              <circle cx="50" cy="50" r={r} stroke="#00ffff" strokeWidth="6" strokeDasharray={dash} strokeLinecap="round" fill="none" />
            ))}
            <text x="50" y="44" textAnchor="middle" fontSize="8" fill="#cbd5e1">Tasks</text>
            <text x="50" y="60" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#f1f5f9">{s.tasksDone}/{s.tasksTotal}</text>
          </svg>
          <span className="text-[9px] text-slate-300 text-center mt-1">{s.name}</span>
        </button>
      );
    })}
  </aside>
);

const AgentHangar = ({ agents, onAgentClick, onAddClick }) => (
  <aside className="fixed right-0 top-0 h-full w-24 border-l border-slate-700/40 bg-slate-900 px-2 pt-0 pb-2 flex flex-col items-center gap-3 overflow-y-auto z-10">
    <div className="sticky top-0 w-full bg-slate-900 pt-3 pb-1 z-20">
      <div className="flex flex-col items-center">
        <button onClick={onAddClick} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">Add</button>
        <h2 className="text-[9px] text-slate-400 mt-1">AGENT HANGAR</h2>
      </div>
    </div>
    {agents.map((a) => (
      <div key={a.id} onClick={() => onAgentClick?.(a)} className="flex flex-col items-center cursor-pointer hover:opacity-90 active:scale-[0.98] transition relative">
        <div className="relative">
          <img src={a.logo} alt={a.name} className="h-10 w-10 rounded-full border border-slate-700 object-contain bg-slate-800" />
          <AgentBadge tier={a.tier} size="large" />
          {a.warnings?.some(w => w.includes('⏰')) && <span className="absolute -bottom-1 -right-1 text-[10px]">⏰</span>}
          {a.warnings?.some(w => w.includes('💰')) && <span className="absolute -bottom-1 right-2 text-[10px]">💰</span>}
        </div>
        <span className="text-[9px] text-slate-400 mt-1">{a.name}</span>
      </div>
    ))}
  </aside>
);


// ---------- Modals ----------
const DocsModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-[32rem] max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">Project Docs</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <ul className="text-[11px] space-y-2">
        <li><button className="underline hover:text-cyan-400">PRD.md</button></li>
        <li><button className="underline hover:text-cyan-400">Vertical Slice Task List (DAG)</button></li>
        <li><button className="underline hover:text-cyan-400">Strategic Technical Addendum</button></li>
      </ul>
    </div>
  </div>
);

const AddPlatformModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-80">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">Add Platform / Model</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <input type="text" placeholder="Platform or Model Name" className="w-full text-[11px] bg-slate-700 p-2 rounded mb-2 border border-slate-600 focus:outline-none" />
      <button className="text-[11px] bg-cyan-700 hover:bg-cyan-600 px-3 py-1 rounded">Add</button>
    </div>
  </div>
);

const ROIModal = ({ totalTokens, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-96">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">ROI Calculator</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <p className="text-[11px] mb-2">Total tokens used: <span className="text-cyan-400">{totalTokens.toLocaleString()}</span></p>
      <p className="text-[11px] text-slate-400">(Placeholder ROI data would appear here)</p>
    </div>
  </div>
);

const TaskCard = ({ task }) => (
  <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 mb-2 text-[11px]">
    <div className="flex justify-between mb-1">
      <span className="font-semibold text-slate-200">{task.name}</span>
      {task.locked && <span title="Dependent task not complete">🔒</span>}
    </div>
    <p className="text-slate-400 mb-1">Tokens used: {task.tokens}</p>
    <p className="text-slate-400 mb-1">Status: {task.status}</p>
    <button disabled={task.locked || task.status !== 'pending'} className="text-[10px] mt-1 px-2 py-1 border border-slate-500 rounded bg-slate-700 text-slate-200 hover:bg-slate-600 disabled:opacity-40">Edit Prompt</button>
  </div>
);

const SliceDetails = ({ slice, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-96 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">{slice.name} Tasks</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <p className="text-[11px] mb-2 text-slate-400">Tokens used to date: {slice.tokens}</p>
      {slice.tasks.map((task) => <TaskCard key={task.id} task={task} />)}
    </div>
  </div>
);

const AgentDetails = ({ agent, onClose }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-96">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">{agent.name}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <p className="text-[11px] mb-1">Tasks assigned: {agent.tasksAssigned}</p>
      <p className="text-[11px] mb-1">Success rate: {agent.successRate}%</p>
      <p className="text-[11px] mb-1">In progress: {agent.inProgress}</p>
      <p className="text-[11px] mb-1">Tokens used: {agent.tokens}</p>
      <p className="text-[11px] mb-1">Warnings: {agent.warnings?.length ? agent.warnings.join(', ') : 'None'}</p>
    </div>
  </div>
);

// ---------- Center Hub ----------
const SliceHub = ({ slice, agents, onAgentClick, onSliceClick }) => {
  const percent = pct(slice.tasksDone, slice.tasksTotal);
  const dash = dashForPercent(percent, 28);
  const statusColors = {
    testing: '#ffcc33',
    received: '#00e5ff',
    'in progress': '#3385ff',
    approved: '#10ffb0',
    'human review': '#ff9900',
  };

  useEffect(() => {
    const st = document.createElement('style');
    st.innerHTML = `@keyframes flow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -60; } }`;
    document.head.appendChild(st);
    return () => document.head.removeChild(st);
  }, []);

  return (
    <div className="relative w-36 h-40 md:w-44 md:h-48 xl:w-48 xl:h-52 flex flex-col items-center justify-center mt-6">
      {/* Clickable ring */}
      <button aria-label="Open slice details" onClick={() => onSliceClick?.(slice)} className="absolute w-[140px] h-[140px] rounded-full cursor-pointer z-10" style={{ inset: 'calc(50% - 70px)' }} />

      <svg viewBox="0 0 100 100" className="w-40 h-40 absolute pointer-events-none">
        <circle cx="50" cy="50" r="26" stroke="#1e293b" strokeWidth="4" fill="none" />
        <circle cx="50" cy="50" r="26" stroke="#00ffff" strokeWidth="4" strokeDasharray={dash} strokeLinecap="round" fill="none" />
      </svg>
      <div className="text-[10px] font-semibold text-slate-100 text-center mb-1">{slice.name}</div>
      <div className="text-[9px] text-slate-400 mb-2">{slice.tasksDone}/{slice.tasksTotal} Tasks</div>

      {agents.map((agent, i) => {
        const angle = (i * (360 / agents.length)) - 90;
        const rad = (angle * Math.PI) / 180;
        const innerR = 26; const outerR = 50;
        const x1 = 50 + innerR * Math.cos(rad);
        const y1 = 50 + innerR * Math.sin(rad);
        const x2 = 50 + outerR * Math.cos(rad);
        const y2 = 50 + outerR * Math.sin(rad);
        const labelX = x2 + Math.cos(rad) * 10;
        const baseLabelY = y2 + Math.sin(rad) * 12;
        const labelYOffset = Math.sin(rad) < -0.2 ? -4 : 0; // nudge labels up for top agents
        const labelY = baseLabelY + labelYOffset;
        const anchor = Math.abs(Math.cos(rad)) > 0.3 ? (Math.cos(rad) < 0 ? 'end' : 'start') : 'middle';

        return (
          <svg key={agent.id} viewBox="0 0 100 100" className="absolute inset-0 overflow-visible cursor-pointer" onClick={() => onAgentClick?.(agent)}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ffff" strokeWidth="1" strokeDasharray="3 5" style={{ animation: `flow 4s linear infinite` }} opacity="0.8" />
            <foreignObject x={x2 - 8} y={y2 - 8} width="16" height="16">
              <div className="relative flex flex-col items-center">
                <img src={agent.logo} alt={agent.name} width="16" height="16" className="rounded-full border border-slate-700 bg-slate-800" />
                <AgentBadge tier={agent.tier} />
              </div>
            </foreignObject>
            <text x={labelX} y={labelY} textAnchor={anchor} fontSize="3" fill="white">{agent.task}</text>
            <text x={labelX} y={labelY + 5} textAnchor={anchor} fontSize="3" fontWeight="bold" fill={statusColors[agent.status] || 'white'}>{agent.status?.toUpperCase?.()}</text>
          </svg>
        );
      })}
    </div>
  );
};

// ---------- Vibes Orb (transparent, pulsing gold rim) ----------
const VibesOrb = () => (
  <button
    aria-label="Open Vibes audio agent"
    className="relative inline-flex flex-col items-center justify-center w-9 h-9 rounded-full bg-transparent text-cyan-200"
    style={{ animation: 'goldPulse 2s infinite' }}
  >
    <span className="text-[9px] leading-none">Vibes</span>
    <span className="text-[10px] leading-none mt-0.5">🎤</span>
  </button>
);

// ---------- Main ----------
export default function AetherMissionControl() {
  useEffect(() => {
    const st = document.createElement('style');
    st.innerHTML = scrollbarStyles + `@keyframes goldPulse { 0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.45); } 70% { box-shadow: 0 0 0 14px rgba(234,179,8,0); } 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); } }`;
    document.head.appendChild(st);
    return () => document.head.removeChild(st);
  }, []);

  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [showDocs, setShowDocs] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showROI, setShowROI] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Demo data (extended to visualize scrolling)
  const agents = [
    { id: 'gemini', name: 'Gemini', logo: '/logos/gemini.png', tier: 'W', task: 'Task 1.24', status: 'in progress', tasksAssigned: 12, successRate: 91, inProgress: 2, tokens: 24000, warnings: ['⏰ Timeout (refresh in 2h)'] },
    { id: 'gpt5', name: 'OpenAI GPT-5', logo: '/logos/openai.png', tier: 'W', task: 'Task 1.25', status: 'received', alert: 'Low credit balance', tasksAssigned: 8, successRate: 87, inProgress: 1, tokens: 19000, warnings: ['💰 Out of credits'] },
    { id: 'claude', name: 'Claude QC', logo: '/logos/anthropic.png', tier: 'Q', task: 'Task 1.26', status: 'testing', tasksAssigned: 14, successRate: 95, inProgress: 3, tokens: 28000, warnings: [] },
    { id: 'roo', name: 'Roo IDE', logo: '/logos/vscode.png', tier: 'M', task: 'Task 1.27', status: 'approved', tasksAssigned: 9, successRate: 90, inProgress: 0, tokens: 15000, warnings: [] },
    { id: 'cursor', name: 'Cursor', logo: '/logos/cursor.png', tier: 'M', task: 'Task 2.03', status: 'in progress', tasksAssigned: 6, successRate: 88, inProgress: 1, tokens: 9000, warnings: [] },
    { id: 'cline', name: 'Cline', logo: '/logos/cline.png', tier: 'M', task: 'Task 2.04', status: 'received', tasksAssigned: 5, successRate: 86, inProgress: 1, tokens: 8000, warnings: [] },
    { id: 'opencode', name: 'OpenCode', logo: '/logos/opencode.png', tier: 'Q', task: 'Task 2.05', status: 'testing', tasksAssigned: 7, successRate: 89, inProgress: 2, tokens: 11000, warnings: [] },
  ];

  const slices = [
    { id: 'S1', name: 'Data Ingestion', tasksDone: 18, tasksTotal: 25, tokens: 40000, tasks: [
      { id: 'T1', name: 'Load schema files', tokens: 1200, status: 'done', locked: false },
      { id: 'T2', name: 'Validate inputs', tokens: 900, status: 'in progress', locked: false },
      { id: 'T3', name: 'Generate API routes', tokens: 0, status: 'pending', locked: true },
    ] },
    { id: 'S2', name: 'Data Analysis', tasksDone: 12, tasksTotal: 20, tokens: 32000, tasks: [
      { id: 'T4', name: 'Fetch analytics data', tokens: 800, status: 'done', locked: false },
      { id: 'T5', name: 'Clean telemetry logs', tokens: 0, status: 'in progress', locked: false },
    ] },
    // Added minimal in-progress tasks so these show in the center view without changing any other behavior
    { id: 'S3', name: 'Auth & RBAC', tasksDone: 0, tasksTotal: 14, tokens: 2000, tasks: [
      { id: 'T6', name: 'Auth policy scaffold', tokens: 300, status: 'in progress', locked: false },
    ] },
    { id: 'S4', name: 'Orchestration', tasksDone: 14, tasksTotal: 14, tokens: 51000, tasks: [] },
    { id: 'S5', name: 'UI Polish', tasksDone: 2, tasksTotal: 10, tokens: 3000, tasks: [
      { id: 'T7', name: 'Refine slice hub labels', tokens: 120, status: 'in progress', locked: false },
    ] },
    { id: 'S6', name: 'MCP Bridges', tasksDone: 1, tasksTotal: 18, tokens: 1200, tasks: [] },
    { id: 'S7', name: 'Observability', tasksDone: 9, tasksTotal: 12, tokens: 18000, tasks: [
      { id: 'T8', name: 'Live metrics stream', tokens: 640, status: 'in progress', locked: false },
    ] },
    { id: 'S8', name: 'Billing', tasksDone: 0, tasksTotal: 8, tokens: 0, tasks: [] },
    { id: 'S9', name: 'Docs', tasksDone: 8, tasksTotal: 8, tokens: 4000, tasks: [] },
    { id: 'S10', name: 'CLI', tasksDone: 3, tasksTotal: 9, tokens: 2200, tasks: [] },
    { id: 'S11', name: 'Deploy', tasksDone: 5, tasksTotal: 11, tokens: 7600, tasks: [] },
    { id: 'S12', name: 'Benchmarks', tasksDone: 0, tasksTotal: 6, tokens: 0, tasks: [] },
  ];

  const progress = pct(
    slices.reduce((a, s) => a + s.tasksDone, 0),
    slices.reduce((a, s) => a + s.tasksTotal, 0)
  );

  const totalTokens = useMemo(() => (
    agents.reduce((a, x) => a + (x.tokens || 0), 0) + slices.reduce((a, x) => a + (x.tokens || 0), 0)
  ), [agents, slices]);

  const activeSlices = useMemo(() => (
    slices.filter((s) => (s.tasks || []).some(t => ["in progress", "received", "testing", "approved"].includes(t.status)))
  ), [slices]);

  return (
    <div className="h-screen bg-[#0a0d17] text-slate-100 flex overflow-hidden">
      <SliceDock slices={slices} onSliceClick={setSelectedSlice} onDocsClick={() => setShowDocs(true)} />

      <main className="flex-1 h-full min-h-0 px-10 pt-0 ml-24 mr-24 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0d17] pt-1 pb-1 -mx-10 px-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-base font-semibold tracking-wide text-slate-200 flex items-center gap-3">
              <VibesOrb /> MISSION CONTROL · <span className="text-cyan-400">Vibeflow</span>
              <button onClick={() => setShowROI(true)} className="ml-3 text-[10px] flex items-center gap-1 bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700">
                {/* Pac‑Man icon */}
                <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden="true" className="inline-block">
                  <defs><clipPath id="mouth"><polygon points="16,16 32,8 32,24" /></clipPath></defs>
                  <circle cx="16" cy="16" r="14" fill="#facc15" clipPath="url(#mouth)" />
                  <circle cx="20" cy="12" r="2" fill="#0a0d17" />
                </svg>
                {totalTokens.toLocaleString()} tokens
              </button>
          </h1>
            <button onClick={() => setShowLogs(true)} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700">View Logs</button>
          </div>

          <p className="text-[11px] text-slate-400 max-w-2xl mb-2">Vibeflow is an AI-driven multi-agent orchestration framework that plans, routes, executes, and validates tasks across internal and external systems with full observability and ROI tracking.</p>
          <div className="relative w-full max-w-2xl h-2 rounded-full bg-slate-800 mb-2">
            <div className="absolute h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Active slices overview (scrollable center) */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
          {activeSlices.length === 0 && (
            <div className="text-[12px] text-slate-400">No active slices at the moment.</div>
          )}
          {activeSlices.map((s) => (
            <div key={s.id} className="flex items-center justify-center">
              <SliceHub slice={s} agents={agents} onAgentClick={setSelectedAgent} onSliceClick={setSelectedSlice} />
            </div>
          ))}
        </div>
      </main>

      <AgentHangar agents={agents} onAgentClick={setSelectedAgent} onAddClick={() => setShowAdd(true)} />

      {/* Modals */}
      {selectedAgent && <AgentDetails agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
      {selectedSlice && <SliceDetails slice={selectedSlice} onClose={() => setSelectedSlice(null)} />}
      {showDocs && <DocsModal onClose={() => setShowDocs(false)} />}
      {showAdd && <AddPlatformModal onClose={() => setShowAdd(false)} />}
      {showROI && <ROIModal totalTokens={totalTokens} onClose={() => setShowROI(false)} />}
      {showLogs && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold">System Logs</h2>
              <button onClick={() => setShowLogs(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="text-[11px] space-y-1">
              <p>[06:40:15 PM] 🔴 API Rate Limit Exceeded (Gemini)</p>
              <p>[06:39:59 PM] 🟡 DB Lookup timed out (4000ms)</p>
              <p>[06:39:30 PM] 🟢 Final prompt cost: 1200 tokens</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
