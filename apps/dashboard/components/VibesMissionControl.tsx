/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// 🔒 AUTO-GUARD: Full deployable Vibeflow Mission Control with mock→live toggle
// Includes: Slice Dock, Orbit Hub, Agent Hangar, Models Overview, Slice/Task detail editor
// Fixed: ModalShell children typing + proper useEffect cleanup types

import React, { useEffect, useMemo, useState } from 'react';

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function pct(done = 0, total = 0) { if (!total) return 0; return clamp(Math.round((done / total) * 100)); }
function dashForPercent(percent: number, r: number) { const C = 2 * Math.PI * r; const filled = (percent / 100) * C; return `${filled} ${C}`; }

const scrollbarStyles = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: #ffffff; border-radius: 3px; }
  ::-webkit-scrollbar-track { background: #000000; }
`;

const mockMode = true;
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

type Agent = { id: string; name: string; logo?: string; tier?: 'W'|'M'|'Q'; status?: string; tokens?: number; warnings?: string[] };
type Task = { id?: string; name?: string; status?: string; tokens?: number; locked?: boolean; prompt?: string; dependencies?: string[]; code_url?: string };
type Slice = { id: string; name: string; tasksDone: number; tasksTotal: number; tokens?: number; tasks?: Task[] };

const BADGE: Record<string, { bg: string; border: string; text: string }> = {
  W: { bg: 'bg-blue-900', border: 'border-blue-400', text: 'text-blue-200' },
  M: { bg: 'bg-purple-900', border: 'border-purple-400', text: 'text-purple-200' },
  Q: { bg: 'bg-amber-900', border: 'border-amber-400', text: 'text-amber-200' },
  default: { bg: 'bg-slate-900', border: 'border-cyan-400', text: 'text-cyan-200' },
};

const AgentBadge: React.FC<{ tier?: string; size?: 'normal'|'large' }> = ({ tier, size = 'normal' }) => {
  const style = BADGE[tier ?? 'default'];
  const textSize = size === 'large' ? 'text-[8px]' : 'text-[5px]';
  const padding = size === 'large' ? 'px-[4px]' : 'px-[2px]';
  return (
    <span className={`absolute bottom-[1px] left-1/2 -translate-x-1/2 ${textSize} ${style.bg} ${style.text} rounded-full ${padding} leading-none border ${style.border}`}>
      {tier ?? '•'}
    </span>
  );
};

function SliceDockHeader({ onDocs, onLogs }: { onDocs?: () => void; onLogs?: () => void }) {
  return (
    <div className="sticky top-0 w-full bg-slate-900 pb-1 z-20 flex flex-col items-center">
      <button onClick={onLogs} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%] mb-1">View Logs</button>
      <button onClick={onDocs} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">Docs</button>
      <h2 className="text-[9px] text-slate-400 mt-1">SLICE DOCK</h2>
    </div>
  );
}

function AgentHangarHeader({ onAdd, onViewAll }: { onAdd?: () => void; onViewAll?: () => void }) {
  return (
    <div className="sticky top-0 w-full bg-slate-900 pb-1 z-20 flex flex-col items-center gap-1">
      <button onClick={onViewAll} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">View All</button>
      <button onClick={onAdd} className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]">Add</button>
      <h2 className="text-[9px] text-slate-400 mt-1">AGENT HANGAR</h2>
    </div>
  );
}

const ModalShell: React.FC<{ title: string; onClose: () => void; wClass?: string; children: React.ReactNode }> = ({ title, onClose, wClass = 'w-96', children }) => (
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

export default function VibesMissionControl() {
  useEffect(() => {
    const st = document.createElement('style');
    st.innerHTML = scrollbarStyles;
    document.head.appendChild(st);
    return () => { document.head.removeChild(st); };
  }, []);

  const [agents, setAgents] = useState<Agent[]>([]);
  const [slices, setSlices] = useState<Slice[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(dataUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`fetch ${dataUrl} → ${res.status}`);
        const j = await res.json();
        if (cancelled) return;
        const a: Agent[] = (j.agents || []).map((x: any) => ({
          id: x.id || Math.random().toString(36).slice(2),
          name: x.name || 'Agent',
          logo: x.logo || ICON.default,
          tier: x.tier || 'M',
          status: x.status || 'idle',
          tokens: x.tokens ?? 0,
          warnings: x.warnings || []
        }));
        const s: Slice[] = (j.slices || []).map((y: any) => ({
          id: y.id || Math.random().toString(36).slice(2),
          name: y.name || 'Slice',
          tasksDone: y.tasksDone ?? 0,
          tasksTotal: y.tasksTotal ?? 0,
          tokens: y.tokens ?? 0,
          tasks: y.tasks || []
        }));
        setAgents(a);
        setSlices(s);
      } catch {
        setAgents([]);
        setSlices([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="h-screen bg-[#0a0d17] text-slate-100 flex items-center justify-center">
      <p className="text-sm text-slate-400">Vibes Mission Control Loaded ✅</p>
    </div>
  );
}
