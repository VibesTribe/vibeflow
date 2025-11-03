// 🔒 AUTO-GUARD: Full deployable Vibeflow Mission Control with mock→live toggle
// Includes: Slice Dock, Orbit Hub, Agent Hangar, Models Overview, Slice/Task detail editor
// New: TaskDetailModal shows dependencies + GitHub "View Code" and optional "Download" link
// Safe‑mod anchors are used so future edits are surgical

import React, { useEffect, useMemo, useState } from 'react';

// === [SECTION:UTILS] HASH: 0a7f62 ===
function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function pct(done = 0, total = 0) { if (!total) return 0; return clamp(Math.round((done / total) * 100)); }
function dashForPercent(percent: number, r: number) { const C = 2 * Math.PI * r; const filled = (percent / 100) * C; return `${filled} ${C}`; }
const scrollbarStyles = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: #ffffff; border-radius: 3px; }
  ::-webkit-scrollbar-track { background: #000000; }
`;
// === [/SECTION:UTILS] ===

// === [SECTION:CONFIG] HASH: 7b9e11 ===
const mockMode = true; // ← flip to false when wiring live telemetry
const dataUrl = mockMode ? '/data/state/dashboard.mock.json' : '/data/state/task.state.json';
const ICON = {
  gemini: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/google-gemini.svg',
  gpt5: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/openai.svg',
  anthropic: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/anthropic.svg',
  vscode: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/vscode.svg',
  cursor: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/cursor.svg',
  cli: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/cli.svg',
  code: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/code.svg',
  default: 'https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/cog.svg',
};
// === [/SECTION:CONFIG] ===

type Agent = { id: string; name: string; logo?: string; tier?: 'W'|'M'|'Q'; status?: string; tokens?: number; warnings?: string[] };
type Task = { id?: string; name?: string; status?: string; tokens?: number; locked?: boolean; prompt?: string; dependencies?: string[]; code_url?: string };
type Slice = { id: string; name: string; tasksDone: number; tasksTotal: number; tokens?: number; tasks?: Task[] };

// === [SECTION:BADGES] HASH: 2e3b44 ===
const BADGE: Record<string, { bg: string; border: string; text: string }> = {
  W: { bg: 'bg-blue-900', border: 'border-blue-400', text: 'text-blue-200' },
  M: { bg: 'bg-purple-900', border: 'border-purple-400', text: 'text-purple-200' },
  Q: { bg: 'bg-amber-900', border: 'border-amber-400', text: 'text-amber-200' },
  default: { bg: 'bg-slate-900', border: 'border-cyan-400', text: 'text-cyan-200' },
};
const AgentBadge: React.FC<{ tier?: string; size?: 'normal'|'large' }> = ({ tier, size = 'normal' }) => {
  const style = BADGE[tier ?? 'default']; const textSize = size === 'large' ? 'text-[8px]' : 'text-[5px]'; const padding = size === 'large' ? 'px-[4px]' : 'px-[2px]';
  return <span className={`absolute bottom-[1px] left-1/2 -translate-x-1/2 ${textSize} ${style.bg} ${style.text} rounded-full ${padding} leading-none border ${style.border} shadow-sm`}>{tier ?? '•'}</span>;
};
// === [/SECTION:BADGES] ===

// === [SECTION:STICKY-HEADERS] HASH: 5c88d1 ===
function SliceDockHeader({ onDocs, onLogs }: { onDocs?: () => void; onLogs?: () => void }) {
  return (
    <div className="sticky top-0 w-full bg-slate-900 pb-1 z-20">
      <div className="flex flex-col items-center">
        <button onClick={onLogs} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%] mb-1">View Logs</button>
        <button onClick={onDocs} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">Docs</button>
        <h2 className="text-[9px] text-slate-400 mt-1">SLICE DOCK</h2>
      </div>
    </div>
  );
}
function AgentHangarHeader({ onAdd, onViewAll }: { onAdd?: () => void; onViewAll?: () => void }) {
  return (
    <div className="sticky top-0 w-full bg-slate-900 pb-1 z-20">
      <div className="flex flex-col items-center gap-1">
        <button onClick={onViewAll} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">View All</button>
        <button onClick={onAdd} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">Add</button>
        <h2 className="text-[9px] text-slate-400 mt-1">AGENT HANGAR</h2>
      </div>
    </div>
  );
}
// === [/SECTION:STICKY-HEADERS] ===

// === [SECTION:SIDEBARS] HASH: 91f4b0 ===
const SliceDock: React.FC<{ slices: Slice[]; onSliceClick?: (s: Slice) => void; onDocs?: () => void; onLogs?: () => void }> = ({ slices, onSliceClick, onDocs, onLogs }) => (
  <aside className="fixed left-0 top-0 h-full w-24 border-r border-slate-700/40 bg-slate-900 px-2 pt-0 pb-2 flex flex-col items-center gap-3 overflow-y-auto z-10">
    <SliceDockHeader onDocs={onDocs} onLogs={onLogs} />
    {slices.length === 0 && <div className="text-[10px] text-slate-500 mt-2 text-center">No slices yet</div>}
    {slices.map((s) => {
      const r = 40; const p = pct(s.tasksDone, s.tasksTotal); const dash = dashForPercent(p, r);
      const isComplete = s.tasksDone >= s.tasksTotal && s.tasksTotal > 0; const notStarted = (s.tasksDone || 0) === 0;
      return (
        <button key={s.id} onClick={() => onSliceClick?.(s)} className="relative flex flex-col items-center hover:opacity-90 active:scale-[0.98] transition">
          <svg viewBox="0 0 100 100" className="w-16 h-16">
            <circle cx="50" cy="50" r={r} stroke="#122033" strokeWidth="6" fill={isComplete ? '#10b981' : 'none'} />
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

const AgentHangar: React.FC<{ agents: Agent[]; onAgentClick?: (a: Agent) => void; onAdd?: () => void; onViewAll?: () => void }> = ({ agents, onAgentClick, onAdd, onViewAll }) => (
  <aside className="fixed right-0 top-0 h-full w-24 border-l border-slate-700/40 bg-slate-900 px-2 pt-0 pb-2 flex flex-col items-center gap-3 overflow-y-auto z-10">
    <AgentHangarHeader onAdd={onAdd} onViewAll={onViewAll} />
    {agents.length === 0 && <div className="text-[10px] text-slate-500 mt-2 text-center">No agents yet</div>}
    {agents.map((a) => (
      <div key={a.id} onClick={() => onAgentClick?.(a)} className="flex flex-col items-center cursor-pointer hover:opacity-90 active:scale-[0.98] transition relative">
        <div className="relative">
          <img src={a.logo || ICON.default} alt={a.name} className="h-10 w-10 rounded-full border border-slate-700 object-contain bg-slate-800" loading="lazy" decoding="async" onError={(e) => { const img = e.currentTarget as HTMLImageElement; if ((img as any).dataset.fallbackApplied) return; img.src = ICON.default; (img as any).dataset.fallbackApplied = '1'; }} />
          <AgentBadge tier={a.tier} size="large" />
          {a.warnings?.some(w => w.includes('⏰')) && <span className="absolute -bottom-1 -right-1 text-[10px]">⏰</span>}
          {a.warnings?.some(w => w.includes('💰')) && <span className="absolute -bottom-1 right-2 text-[10px]">💰</span>}
        </div>
        <span className="text-[9px] text-slate-400 mt-1 text-center max-w-[5rem] truncate">{a.name}</span>
      </div>
    ))}
  </aside>
);
// === [/SECTION:SIDEBARS] ===

// === [SECTION:MODALS] HASH: c5a1ef ===
const ModalShell: React.FC<{ title: string; onClose: () => void; wClass?: string }> = ({ title, onClose, wClass = 'w-96', children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className={`bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 ${wClass} max-h-[80vh] overflow-y-auto`}>
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      {children}
    </div>
  </div>
);
const DocsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalShell title="Project Docs" onClose={onClose} wClass="w-[32rem]">
    <ul className="text-[11px] space-y-2">
      <li><button className="underline hover:text-cyan-400">PRD.md</button></li>
      <li><button className="underline hover:text-cyan-400">Vertical Slice Task List (DAG)</button></li>
      <li><button className="underline hover:text-cyan-400">Strategic Technical Addendum</button></li>
    </ul>
  </ModalShell>
);
const AddPlatformModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalShell title="Add Platform / Model" onClose={onClose} wClass="w-80">
    <input type="text" placeholder="Platform or Model Name" className="w-full text-[11px] bg-slate-700 p-2 rounded mb-2 border border-slate-600 focus:outline-none" />
    <button className="text-[11px] bg-cyan-700 hover:bg-cyan-600 px-3 py-1 rounded">Add</button>
  </ModalShell>
);
const ROIModal: React.FC<{ totalTokens: number; onClose: () => void }> = ({ totalTokens, onClose }) => (
  <ModalShell title="ROI Calculator" onClose={onClose}>
    <p className="text-[11px] mb-2">Total tokens used: <span className="text-cyan-400">{totalTokens.toLocaleString()}</span></p>
    <p className="text-[11px] text-slate-400">(Placeholder ROI data would appear here)</p>
  </ModalShell>
);
const AgentDetails: React.FC<{ agent: Agent; onClose: () => void }> = ({ agent, onClose }) => (
  <ModalShell title={agent.name} onClose={onClose}>
    <p className="text-[11px] mb-1">Status: {agent.status}</p>
    <p className="text-[11px] mb-1">Tokens used: {agent.tokens ?? 0}</p>
    <p className="text-[11px] mb-1">Warnings: {agent.warnings?.length ? agent.warnings.join(', ') : 'None'}</p>
  </ModalShell>
);
const TaskCard: React.FC<{ task: Task; onSelect: (t: Task) => void }> = ({ task = {}, onSelect }) => {
  const status = task.status || 'pending';
  const statusColor = status === 'done' ? 'text-green-400' : status === 'in progress' ? 'text-blue-400' : 'text-amber-400';
  const borderColor = status === 'done' ? 'border-green-600' : status === 'in progress' ? 'border-blue-600' : 'border-amber-600';
  return (
    <div onClick={() => onSelect(task)} className={`cursor-pointer bg-slate-800 border ${borderColor} rounded-lg p-3 mb-2 text-[11px] hover:bg-slate-700 transition`}>
      <div className="flex justify-between mb-1">
        <span className={`font-semibold ${statusColor}`}>{task.name || 'Unnamed Task'}</span>
        {task.locked && <span title="Dependent task not complete">🔒</span>}
      </div>
      <p className="text-slate-400 mb-1">Tokens used: {task.tokens ?? 0}</p>
      <p className={`${statusColor} mb-1`}>Status: {status}</p>
    </div>
  );
};
const TaskDetailModal: React.FC<{ task: Task; onClose: () => void }> = ({ task = {}, onClose }) => {
  const [prompt, setPrompt] = useState(task.prompt || '');
  const codeUrl = task.code_url && typeof task.code_url === 'string' ? task.code_url : '';
  const isDownloadable = codeUrl && /\.(ts|tsx|js|jsx|json|py|md|sql|yaml|yml|toml|ini|sh)$/i.test(codeUrl);
  return (
    <ModalShell title={task.name || 'Unnamed Task'} onClose={onClose} wClass="w-[36rem]">
      <p className="text-[11px] mb-1">Status: <span className="text-blue-400">{task.status || 'pending'}</span></p>
      <p className="text-[11px] mb-1">Tokens used: {task.tokens ?? 0}</p>
      {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
        <p className="text-[11px] mb-2 text-amber-400">Depends on: {task.dependencies.join(', ')}</p>
      )}
      {codeUrl && (
        <div className="flex items-center gap-2 mb-2 text-[11px]">
          <a href={codeUrl} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1" title="Open on GitHub">
            <span>🔗</span> View Code
          </a>
          {isDownloadable && (
            <a href={codeUrl} download className="text-slate-300 hover:text-white underline" title="Download file">⬇ Download</a>
          )}
        </div>
      )}
      <p className="text-[11px] text-slate-400 mb-1">Prompt / Packet:</p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="w-full h-40 bg-slate-700 text-[11px] p-2 rounded border border-slate-600 focus:outline-none" />
    </ModalShell>
  );
};
const SliceDetails: React.FC<{ slice: Slice; onClose: () => void }> = ({ slice = {}, onClose }) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const tasks = Array.isArray(slice.tasks) && slice.tasks.length > 0 ? slice.tasks : [
    { id: 'T1', name: 'Load schema files', status: 'done', tokens: 1200, prompt: 'Loads schema files from /schemas folder.', dependencies: [], code_url: 'https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/schemas/loadSchemas.ts' },
    { id: 'T2', name: 'Validate inputs', status: 'in progress', tokens: 900, prompt: 'Validates incoming data against schema.', dependencies: ['T1'], code_url: 'https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/validation/validateInputs.ts' },
    { id: 'T3', name: 'Generate API routes', status: 'pending', tokens: 0, prompt: 'Generates REST endpoints for validated schema.', dependencies: ['T2'], code_url: 'https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/server/generateRoutes.ts' }
  ];
  return (
    <div>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-[32rem] max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold">{slice.name || 'Unnamed Slice'} Tasks</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
          </div>
          <p className="text-[11px] mb-2 text-slate-400">Tokens used to date: {slice.tokens ?? 0}</p>
          {tasks.map((task) => (
            <TaskCard key={task.id || task.name || Math.random().toString(36)} task={task} onSelect={setSelectedTask} />
          ))}
        </div>
      </div>
      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />}
    </div>
  );
};
// === [/SECTION:MODALS] ===

// === [SECTION:MODELS-OVERVIEW] HASH: 1f7b32 ===
const ModelsOverviewModal: React.FC<{ onClose: () => void; agents: Agent[] }> = ({ onClose, agents }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-[32rem] max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">Model Overview Panel</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <div className="text-[11px] space-y-3">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>🟢 Ready</span>
          <span>🟡 Cooldown</span>
          <span>💰 Credit Needed</span>
          <span>⚠️ Issue</span>
        </div>
        {agents.map((a) => (
          <div key={a.id} className="border-t border-slate-700 pt-2">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold ${a.tier === 'W' ? 'text-blue-400' : a.tier === 'M' ? 'text-purple-400' : 'text-amber-400'}`}>{a.name}</span>
              <span className="text-[10px] text-slate-400">({a.status || 'Idle'})</span>
            </div>
            <p className="text-[10px] text-slate-400 ml-1">Tokens Used: {a.tokens?.toLocaleString() ?? 0}</p>
            {a.warnings?.length ? (
              <p className="text-[10px] text-amber-400 ml-1">Warnings: {a.warnings.join(', ')}</p>
            ) : (
              <p className="text-[10px] text-green-400 ml-1">All systems nominal</p>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);
// === [/SECTION:MODELS-OVERVIEW] ===

// === [SECTION:CENTER-HUB] HASH: a0dd52 ===
const OrbitSliceHub: React.FC<{ slice: Slice; agents: Agent[]; onAgentClick?: (a: Agent) => void; onSliceClick?: (s: Slice) => void }> = ({ slice, agents, onAgentClick, onSliceClick }) => {
  const percent = pct(slice.tasksDone, slice.tasksTotal); const dash = dashForPercent(percent, 28);
  useEffect(() => { const st = document.createElement('style'); st.innerHTML = `@keyframes flow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -60; } }`; document.head.appendChild(st); return () => document.head.removeChild(st); }, []);
  return (
    <div className="relative w-36 h-40 md:w-44 md:h-48 xl:w-48 xl:h-52 flex flex-col items-center justify-center mt-6">
      <button aria-label="Open slice details" onClick={() => onSliceClick?.(slice)} className="absolute w-[140px] h-[140px] rounded-full cursor-pointer z-10" style={{ inset: 'calc(50% - 70px)' }} />
      <svg viewBox="0 0 100 100" className="w-40 h-40 absolute pointer-events-none">
        <circle cx="50" cy="50" r="26" stroke="#1e293b" strokeWidth="4" fill="none" />
        <circle cx="50" cy="50" r="26" stroke="#00ffff" strokeWidth="4" strokeDasharray={dash} strokeLinecap="round" fill="none" />
      </svg>
      <div className="text-[10px] font-semibold text-slate-100 text-center mb-1">{slice.name}</div>
      <div className="text-[9px] text-slate-400 mb-2">{slice.tasksDone}/{slice.tasksTotal} Tasks</div>
      {agents.map((agent, i) => {
        const angle = (i * (360 / Math.max(agents.length,1))) - 90; const rad = (angle * Math.PI) / 180; const innerR = 26; const outerR = 50;
        const x1 = 50 + innerR * Math.cos(rad); const y1 = 50 + innerR * Math.sin(rad); const x2 = 50 + outerR * Math.cos(rad); const y2 = 50 + outerR * Math.sin(rad);
        const labelX = x2 + Math.cos(rad) * 10; const baseLabelY = y2 + Math.sin(rad) * 12; const labelYOffset = Math.sin(rad) < -0.2 ? -4 : 0; const labelY = baseLabelY + labelYOffset;
        const anchor = Math.abs(Math.cos(rad)) > 0.3 ? (Math.cos(rad) < 0 ? 'end' : 'start') : 'middle';
        return (
          <svg key={agent.id} viewBox="0 0 100 100" className="absolute inset-0 overflow-visible cursor-pointer" onClick={() => onAgentClick?.(agent)}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ffff" strokeWidth="1" strokeDasharray="3 5" style={{ animation: `flow 4s linear infinite` }} opacity="0.8" />
            <foreignObject x={x2 - 8} y={y2 - 8} width="16" height="16">
              <div className="relative flex flex-col items-center">
                <img src={agent.logo || ICON.default} alt={agent.name} width="16" height="16" className="rounded-full border border-slate-700 bg-slate-800" loading="lazy" decoding="async" onError={(e) => { const img = e.currentTarget as HTMLImageElement; if ((img as any).dataset.fallbackApplied) return; img.src = ICON.default; (img as any).dataset.fallbackApplied = '1'; }} />
                <AgentBadge tier={agent.tier} />
              </div>
            </foreignObject>
            <text x={labelX} y={labelY} textAnchor={anchor} fontSize="3" fill="white">{agent.status || agent.name}</text>
          </svg>
        );
      })}
    </div>
  );
};
// === [/SECTION:CENTER-HUB] ===

// === [SECTION:HEADER] HASH: d13a77 ===
function VibesOrb() {
  return (
    <button aria-label="Open Vibes audio agent" className="relative inline-flex flex-col items-center justify-center w-9 h-9 rounded-full bg-transparent text-cyan-200" style={{ animation: 'goldPulse 2s infinite' }}>
      <span className="text-[9px] leading-none">Vibes</span>
      <span className="text-[10px] leading-none mt-0.5">🎤</span>
    </button>
  );
}
function HeaderBar({ onROI }: { onROI: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-[#0a0d17] pt-1 pb-1 -mx-10 px-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-base font-semibold tracking-wide text-slate-200 flex items-center gap-3">
          <VibesOrb /> MISSION CONTROL · <span className="text-cyan-400">Vibeflow</span>
          <button onClick={onROI} className="ml-3 text-[10px] flex items-center gap-1 bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700">
            <svg width="14" height="14" viewBox="0 0 32 32" aria-hidden="true" className="inline-block"><defs><clipPath id="mouth"><polygon points="16,16 32,8 32,24" /></clipPath></defs><circle cx="16" cy="16" r="14" fill="#facc15" clipPath="url(#mouth)" /><circle cx="20" cy="12" r="2" fill="#0a0d17" /></svg>
            tokens
          </button>
        </h1>
        {/* View Logs moved to Slice Dock header */}
      </div>
      <p className="text-[11px] text-slate-400 max-w-2xl mb-2">Vibeflow is an AI-driven multi-agent orchestration framework that plans, routes, executes, and validates tasks across systems with full observability and ROI tracking.</p>
    </div>
  );
}
// === [/SECTION:HEADER] ===

// === [SECTION:ROOT] HASH: 6e22c8 ===
export default function VibesMissionControl() {
  useEffect(() => { const st = document.createElement('style'); st.innerHTML = scrollbarStyles + `@keyframes goldPulse { 0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.45); } 70% { box-shadow: 0 0 0 14px rgba(234,179,8,0); } 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); } }`; document.head.appendChild(st); return () => document.head.removeChild(st); }, []);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [showROI, setShowROI] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showModelsOverview, setShowModelsOverview] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSlice, setSelectedSlice] = useState<Slice | null>(null);

  // Demo data; replaced by snapshot when available
  const demoAgents: Agent[] = useMemo(() => ([
    { id: 'gemini', name: 'Gemini', logo: ICON.gemini, tier: 'W', status: 'in progress', tokens: 24000, warnings: ['⏰ Timeout (refresh in 2h)'] },
    { id: 'gpt5', name: 'OpenAI GPT-5', logo: ICON.gpt5, tier: 'W', status: 'received', tokens: 19000, warnings: ['💰 Out of credits'] },
    { id: 'claude', name: 'Claude QC', logo: ICON.anthropic, tier: 'Q', status: 'testing', tokens: 28000 },
    { id: 'roo', name: 'Roo IDE', logo: ICON.vscode, tier: 'M', status: 'approved', tokens: 15000 },
    { id: 'cursor', name: 'Cursor', logo: ICON.cursor, tier: 'M', status: 'in progress', tokens: 9000 },
    { id: 'cline', name: 'Cline', logo: ICON.cli, tier: 'M', status: 'received', tokens: 8000 },
    { id: 'opencode', name: 'OpenCode', logo: ICON.code, tier: 'Q', status: 'testing', tokens: 11000 },
  ]), []);
  const demoSlices: Slice[] = useMemo(() => ([
    { id: 'S1', name: 'Data Ingestion', tasksDone: 18, tasksTotal: 25, tokens: 40000, tasks: [
      { id: 'T1', name: 'Load schema files', status: 'done', tokens: 1200, prompt: 'Loads schema files from /schemas folder.', dependencies: [], code_url: 'https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/schemas/loadSchemas.ts' },
      { id: 'T2', name: 'Validate inputs', status: 'in progress', tokens: 900, prompt: 'Validates incoming data against schema.', dependencies: ['T1'], code_url: 'https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/validation/validateInputs.ts' },
      { id: 'T3', name: 'Generate API routes', status: 'pending', tokens: 0, prompt: 'Generates REST endpoints for validated schema.', dependencies: ['T2'], code_url: 'https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/server/generateRoutes.ts' }
    ] },
    { id: 'S2', name: 'Data Analysis', tasksDone: 12, tasksTotal: 20, tokens: 32000, tasks: [] },
    { id: 'S3', name: 'Auth & RBAC', tasksDone: 0, tasksTotal: 14, tokens: 2000, tasks: [] },
    { id: 'S4', name: 'Orchestration', tasksDone: 14, tasksTotal: 14, tokens: 51000, tasks: [] },
    { id: 'S5', name: 'UI Polish', tasksDone: 2, tasksTotal: 10, tokens: 3000, tasks: [] },
    { id: 'S6', name: 'MCP Bridges', tasksDone: 1, tasksTotal: 18, tokens: 1200, tasks: [] },
    { id: 'S7', name: 'Observability', tasksDone: 9, tasksTotal: 12, tokens: 18000, tasks: [] },
    { id: 'S8', name: 'Billing', tasksDone: 0, tasksTotal: 8, tokens: 0, tasks: [] },
  ]), []);

  // Load snapshot if available; fallback to demo
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(dataUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`fetch ${dataUrl} → ${res.status}`);
        const j = await res.json();
        if (cancelled) return;
        const a: Agent[] = (j.agents || []).map((x: any) => ({ id: x.id?.replace(/^agent\./, '') || x.id || Math.random().toString(36).slice(2), name: x.name || 'Agent', logo: x.logo || x.logo_url || ICON.default, tier: x.tier || 'M', status: (x.status || '').replace('_', ' '), tokens: x.tokens ?? 0, warnings: x.warnings || [] }));
        const s: Slice[] = (j.slices || []).map((y: any) => ({ id: y.id || Math.random().toString(36).slice(2), name: y.name || 'Slice', tasksDone: y.tasksDone ?? 0, tasksTotal: y.tasksTotal ?? 0, tokens: y.tokens ?? 0, tasks: Array.isArray(y.tasks) ? y.tasks : [] }));
        setAgents(a.length ? a : demoAgents);
        setSlices(s.length ? s : demoSlices);
      } catch {
        setAgents(demoAgents); setSlices(demoSlices);
      }
    })();
    return () => { cancelled = true; };
  }, [demoAgents, demoSlices]);

  const totalTokens = useMemo(() => (agents.reduce((acc, x) => acc + (x.tokens || 0), 0) + slices.reduce((acc, x) => acc + (x.tokens || 0), 0)), [agents, slices]);

  const activeSlices = useMemo(() => (slices.filter((s) => (s.tasks || []).some((t: any) => ['in progress', 'received', 'testing', 'approved'].includes(t.status)))), [slices]);

  return (
    <div className="h-screen bg-[#0a0d17] text-slate-100 flex overflow-hidden">
      {/* Left Dock */}
      <SliceDock slices={slices} onSliceClick={setSelectedSlice} onDocs={() => setShowDocs(true)} onLogs={() => setShowLogs(true)} />

      {/* Main */}
      <main className="flex-1 h-full min-h-0 px-10 pt-0 ml-24 mr-24 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#0a0d17] pt-1 pb-1 -mx-10 px-10">
          <HeaderBar onROI={() => setShowROI(true)} />
        </div>

        {/* Progress strip */}
        <div className="relative w-full max-w-2xl h-2 rounded-full bg-slate-800 mb-2">
          <div className="absolute h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full" style={{ width: `${clamp(Math.round((activeSlices.length / Math.max(slices.length,1)) * 100))}%` }} />
        </div>

        {/* Center grid with orbit hubs */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
          {activeSlices.length === 0 && <div className="text-[12px] text-slate-400">No active slices at the moment.</div>}
          {activeSlices.map((s) => (
            <div key={s.id} className="flex items-center justify-center">
              <OrbitSliceHub slice={s} agents={agents} onAgentClick={(a) => setSelectedAgent(a)} onSliceClick={(x) => setSelectedSlice(x)} />
            </div>
          ))}
        </div>
      </main>

      {/* Right Hangar */}
      <AgentHangar agents={agents} onAgentClick={(a) => setSelectedAgent(a)} onAdd={() => setShowAdd(true)} onViewAll={() => setShowModelsOverview(true)} />

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
      {showModelsOverview && <ModelsOverviewModal onClose={() => setShowModelsOverview(false)} agents={agents} />}
    </div>
  );
}
// === [/SECTION:ROOT] ===

/*
================================================================================
apps/dashboard/VibesPreview.tsx  (COPY THIS INTO A NEW FILE IN REPO)
--------------------------------------------------------------------------------
import React from 'react';
import VibesMissionControl from './components/VibesMissionControl';

export default function VibesPreview() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  if (view === 'vibes') return <VibesMissionControl />;
  return <div style={{padding: 24, color: '#cbd5e1', background: '#0a0d17'}}>
    <h1 style={{fontSize: 16, fontWeight: 600}}>Vibeflow</h1>
    <p style={{fontSize: 12, opacity: 0.8}}>Append <code>?view=vibes</code> to the URL to open Mission Control.</p>
  </div>;
}
================================================================================
*/
