import React, { FormEvent, useMemo, useState } from "react";

interface RunTaskButtonProps {
  endpoint?: string;
  token?: string;
  onQueued?: (info: { taskId: string; provider?: string | null }) => void;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

const DEFAULT_CONFIDENCE = 0.95;

const RunTaskButton: React.FC<RunTaskButtonProps> = ({ endpoint, token, onQueued }) => {
  const resolvedEndpoint = endpoint ?? import.meta.env.VITE_RUN_TASK_ENDPOINT ?? "http://localhost:3030/run-task";
  const resolvedToken = token ?? import.meta.env.VITE_MCP_TOKEN;

  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState(() => generateTaskId());
  const [title, setTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE.toFixed(2));
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isValid = useMemo(() => title.trim().length > 0 && deliverables.trim().length > 0, [title, deliverables]);

  const resetForm = () => {
    setTaskId(generateTaskId());
    setTitle("");
    setObjectives("");
    setDeliverables("");
    setConfidence(DEFAULT_CONFIDENCE.toFixed(2));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid || state === "submitting") {
      return;
    }

    setState("submitting");
    setMessage(null);

    try {
      const payload = buildPayload({ taskId, title, objectives, deliverables, confidence });
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (typeof resolvedToken === "string" && resolvedToken.trim().length > 0) {
        headers.Authorization = `Bearer ${resolvedToken}`;
      }

      const response = await fetch(resolvedEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? `Request failed with status ${response.status}`);
      }

      const taskInfo = data.data ?? {};
      setState("success");
      setMessage(`Queued ${taskInfo.task_id ?? taskId} via ${taskInfo.provider ?? "router"}`);
      onQueued?.({ taskId: taskInfo.task_id ?? taskId, provider: taskInfo.provider ?? null });
      resetForm();
      setOpen(false);
    } catch (error) {
      setState("error");
      setMessage((error as Error).message);
      console.error("[run-task] dispatch failed", error);
    }
  };

  return (
    <div className="run-task">
      <button
        type="button"
        className="run-task__button"
        onClick={() => {
          setOpen((value) => !value);
          setState("idle");
          setMessage(null);
        }}
      >
        <span>Run Task</span>
      </button>
      {open && (
        <form className="run-task__panel" onSubmit={handleSubmit}>
          <div className="run-task__row">
            <label htmlFor="run-task-id">Task ID</label>
            <div className="run-task__input-group">
              <input
                id="run-task-id"
                type="text"
                value={taskId}
                onChange={(event) => setTaskId(event.target.value)}
                required
              />
              <button type="button" onClick={() => setTaskId(generateTaskId())}>
                Regenerate
              </button>
            </div>
          </div>
          <div className="run-task__row">
            <label htmlFor="run-task-title">Title</label>
            <input
              id="run-task-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Mission objective"
              required
            />
          </div>
          <div className="run-task__row">
            <label htmlFor="run-task-objectives">Objectives</label>
            <textarea
              id="run-task-objectives"
              value={objectives}
              onChange={(event) => setObjectives(event.target.value)}
              placeholder="One objective per line"
              rows={3}
            />
          </div>
          <div className="run-task__row">
            <label htmlFor="run-task-deliverables">Deliverables</label>
            <textarea
              id="run-task-deliverables"
              value={deliverables}
              onChange={(event) => setDeliverables(event.target.value)}
              placeholder="Path to expected output (one per line)"
              rows={2}
              required
            />
          </div>
          <div className="run-task__row">
            <label htmlFor="run-task-confidence">Confidence</label>
            <input
              id="run-task-confidence"
              type="number"
              step="0.01"
              min="0.95"
              max="1"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
            />
          </div>
          {message && (
            <p className={state === "error" ? "run-task__message run-task__message--error" : "run-task__message"}>{message}</p>
          )}
          <div className="run-task__actions">
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" disabled={!isValid || state === "submitting"}>
              {state === "submitting" ? "Dispatching..." : "Queue mission"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

function buildPayload({
  taskId,
  title,
  objectives,
  deliverables,
  confidence,
}: {
  taskId: string;
  title: string;
  objectives: string;
  deliverables: string;
  confidence: string;
}) {
  const objectiveList = splitLines(objectives);
  const deliverableList = splitLines(deliverables);
  const parsedConfidence = clampConfidence(Number(confidence));

  return {
    task_id: taskId,
    title,
    objectives: objectiveList.length > 0 ? objectiveList : [title],
    deliverables: deliverableList,
    confidence: parsedConfidence,
    edit_scope: [],
    metadata: {
      source: "dashboard",
      created_at: new Date().toISOString(),
    },
  };
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_CONFIDENCE;
  }
  return Math.min(1, Math.max(0.95, Number(value.toFixed(2))));
}

function generateTaskId(): string {
  return `task/${Date.now().toString(36)}`;
}

export default RunTaskButton;
