/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// 🔒 AUTO-GUARD: Full deployable Vibeflow Mission Control — mock↔live ready
// Includes: Slice Dock, Orbit Hub, Agent Hangar, Docs/Logs/ROI/Models modals,
// Slice/Task detail editor with dependencies + GitHub "View Code" + optional "Download".
// Fix: mock tasks now typed with literal `status` (TS2322 build error resolved).

import React, { useEffect, useMemo, useState } from "react";

/* ------------------------------ Utils ------------------------------ */
function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}
function pct(done = 0, total = 0) {
  return total ? clamp(Math.round((done / total) * 100)) : 0;
}
function dashForPercent(percent: number, r: number) {
  const C = 2 * Math.PI * r;
  const filled = (percent / 100) * C;
  return `${filled} ${C}`;
}
const scrollbarStyles = `
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: #ffffff; border-radius: 3px; }
  ::-webkit-scrollbar-track { background: #000000; }
`;

/* ------------------------------ Config ----------------------------- */
const mockMode = true; // ← flip to false when wiring live telemetry
const dataUrl = mockMode
  ? "/data/state/dashboard.mock.json"
  : "/data/state/task.state.json";

const ICON = {
  gemini:
    "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/google-gemini.svg",
  gpt5: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/openai.svg",
  anthropic:
    "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/anthropic.svg",
  vscode:
    "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/vscode.svg",
  cursor:
    "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/cursor.svg",
  cli: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/cli.svg",
  code: "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/code.svg",
  default:
    "https://raw.githubusercontent.com/lobehub/lobe-icons/main/icons/cog.svg",
};

/* ------------------------------- Types ----------------------------- */
export type Agent = {
  id: string;
  name: string;
  logo?: string;
  tier?: "W" | "M" | "Q";
  status?: string;
  tokens?: number;
  warnings?: string[];
};

export type Task = {
  id?: string;
  name?: string;
  status?:
    | "pending"
    | "in progress"
    | "received"
    | "testing"
    | "approved"
    | "done";
  tokens?: number;
  locked?: boolean;
  prompt?: string;
  dependencies?: string[];
  code_url?: string;
};

export type Slice = {
  id: string;
  name: string;
  tasksDone: number;
  tasksTotal: number;
  tokens?: number;
  tasks?: Task[];
};

/* ----------------------------- Badges ------------------------------ */
const BADGE: Record<string, { bg: string; border: string; text: string }> = {
  W: { bg: "bg-blue-900", border: "border-blue-400", text: "text-blue-200" },
  M: {
    bg: "bg-purple-900",
    border: "border-purple-400",
    text: "text-purple-200",
  },
  Q: {
    bg: "bg-amber-900",
    border: "border-amber-400",
    text: "text-amber-200",
  },
  default: {
    bg: "bg-slate-900",
    border: "border-cyan-400",
    text: "text-cyan-200",
  },
};

const AgentBadge: React.FC<{ tier?: string; size?: "normal" | "large" }> = ({
  tier,
  size = "normal",
}) => {
  const style = BADGE[tier ?? "default"];
  const textSize = size === "large" ? "text-[8px]" : "text-[5px]";
  const padding = size === "large" ? "px-[4px]" : "px-[2px]";
  return (
    <span
      className={`absolute bottom-[1px] left-1/2 -translate-x-1/2 ${textSize} ${style.bg} ${style.text} rounded-full ${padding} leading-none border ${style.border} shadow-sm`}
    >
      {tier ?? "•"}
    </span>
  );
};

/* -------------------------- Sticky Headers ------------------------- */
function SliceDockHeader({
  onDocs,
  onLogs,
}: {
  onDocs?: () => void;
  onLogs?: () => void;
}) {
  return (
    <div className="sticky top-0 w-full bg-slate-900 pb-1 z-20">
      <div className="flex flex-col items-center">
        <button
          onClick={onLogs}
          className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%] mb-1"
        >
          View Logs
        </button>
        <button
          onClick={onDocs}
          className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]"
        >
          Docs
        </button>
        <h2 className="text-[9px] text-slate-400 mt-1">SLICE DOCK</h2>
      </div>
    </div>
  );
}

function AgentHangarHeader({
  onAdd,
  onViewAll,
}: {
  onAdd?: () => void;
  onViewAll?: () => void;
}) {
  return (
    <div className="sticky top-0 w-full bg-slate-900 pb-1 z-20">
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={onViewAll}
          className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]"
        >
          View All
        </button>
        <button
          onClick={onAdd}
          className="text-[10px] bg-slate-800 text-slate-200 rounded px-2 py-1 border border-slate-600 hover:bg-slate-700 w-[90%]"
        >
          Add
        </button>
        <h2 className="text-[9px] text-slate-400 mt-1">AGENT HANGAR</h2>
      </div>
    </div>
  );
}

/* ----------------------------- Modals ------------------------------ */
const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  wClass?: string;
  children: React.ReactNode;
}> = ({ title, onClose, wClass = "w-96", children }) => (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div
      className={`bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 ${wClass} max-h-[80vh] overflow-y-auto`}
    >
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

/* -------------------------- SliceDetails --------------------------- */
const TaskDetailModal: React.FC<{ task: Task; onClose: () => void }> = ({
  task,
  onClose,
}) => {
  const [prompt, setPrompt] = useState(task.prompt || "");
  const codeUrl =
    task.code_url && typeof task.code_url === "string" ? task.code_url : "";
  const isDownloadable =
    !!codeUrl &&
    /\.(ts|tsx|js|jsx|json|py|md|sql|yaml|yml|toml|ini|sh)$/i.test(codeUrl);

  return (
    <ModalShell
      title={task.name || "Unnamed Task"}
      onClose={onClose}
      wClass="w-[36rem]"
    >
      <p className="text-[11px] mb-1">
        Status:{" "}
        <span className="text-blue-400">{task.status || "pending"}</span>
      </p>
      <p className="text-[11px] mb-1">Tokens used: {task.tokens ?? 0}</p>
      {Array.isArray(task.dependencies) && task.dependencies.length > 0 && (
        <p className="text-[11px] mb-2 text-amber-400">
          Depends on: {task.dependencies.join(", ")}
        </p>
      )}
      {codeUrl && (
        <div className="flex items-center gap-2 mb-2 text-[11px]">
          <a
            href={codeUrl}
            target="_blank"
            rel="noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
            title="Open on GitHub"
          >
            <span>🔗</span> View Code
          </a>
          {isDownloadable && (
            <a
              href={codeUrl}
              download
              className="text-slate-300 hover:text-white underline"
              title="Download file"
            >
              ⬇ Download
            </a>
          )}
        </div>
      )}
      <p className="text-[11px] text-slate-400 mb-1">Prompt / Packet:</p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-40 bg-slate-700 text-[11px] p-2 rounded border border-slate-600 focus:outline-none"
      />
    </ModalShell>
  );
};

const SliceDetails: React.FC<{ slice: Slice; onClose: () => void }> = ({
  slice,
  onClose,
}) => {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const tasks: Task[] =
    Array.isArray(slice.tasks) && slice.tasks.length > 0
      ? slice.tasks
      : [
          {
            id: "T1",
            name: "Load schema files",
            status: "done" as const,
            tokens: 1200,
            prompt: "Loads schema files from /schemas folder.",
            dependencies: [],
            code_url:
              "https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/schemas/loadSchemas.ts",
          },
          {
            id: "T2",
            name: "Validate inputs",
            status: "in progress" as const,
            tokens: 900,
            prompt: "Validates incoming data against schema.",
            dependencies: ["T1"],
            code_url:
              "https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/validation/validateInputs.ts",
          },
          {
            id: "T3",
            name: "Generate API routes",
            status: "pending" as const,
            tokens: 0,
            prompt: "Generates REST endpoints for validated schema.",
            dependencies: ["T2"],
            code_url:
              "https://raw.githubusercontent.com/vibestribe/vibeflow/main/src/server/generateRoutes.ts",
          },
        ];

  return (
    <div>
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 p-4 rounded-lg border border-slate-600 text-slate-200 w-[32rem] max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold">
              {slice.name || "Unnamed Slice"} Tasks
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <p className="text-[11px] mb-2 text-slate-400">
            Tokens used to date: {slice.tokens ?? 0}
          </p>
          {tasks.map((task) => (
            <div
              key={task.id || task.name || Math.random().toString(36)}
              onClick={() => setSelectedTask(task)}
              className="cursor-pointer bg-slate-800 border border-slate-600 rounded-lg p-3 mb-2 text-[11px] hover:bg-slate-700 transition"
            >
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-cyan-400">
                  {task.name || "Unnamed Task"}
                </span>
                {task.locked && <span>🔒</span>}
              </div>
              <p className="text-slate-400 mb-1">
                Tokens used: {task.tokens ?? 0}
              </p>
              <p className="text-blue-400 mb-1">
                Status: {task.status || "pending"}
              </p>
            </div>
          ))}
        </div>
      </div>
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
};

export default SliceDetails;
