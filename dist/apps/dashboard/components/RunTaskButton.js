import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { queueTaskViaGitHub } from "../utils/github";
const DEFAULT_CONFIDENCE = 0.95;
const RunTaskButton = ({ endpoint, token, onQueued }) => {
    const resolvedEndpoint = endpoint ?? import.meta.env.VITE_RUN_TASK_ENDPOINT ?? "http://localhost:3030/run-task";
    const resolvedToken = token ?? import.meta.env.VITE_MCP_TOKEN;
    const githubOwner = import.meta.env.VITE_GITHUB_OWNER;
    const githubRepo = import.meta.env.VITE_GITHUB_REPO;
    const githubBranch = import.meta.env.VITE_GITHUB_BRANCH ?? "codex";
    const githubWorkflow = import.meta.env.VITE_GITHUB_WORKFLOW ?? "mission-loop.yml";
    const hasEndpoint = Boolean(resolvedEndpoint);
    const hasGithubConfig = Boolean(githubOwner && githubRepo);
    const initialMode = hasEndpoint ? "mcp" : hasGithubConfig ? "github" : "mcp";
    const [open, setOpen] = useState(false);
    const [taskId, setTaskId] = useState(() => generateTaskId());
    const [title, setTitle] = useState("");
    const [objectives, setObjectives] = useState("");
    const [deliverables, setDeliverables] = useState("");
    const [confidence, setConfidence] = useState(DEFAULT_CONFIDENCE.toFixed(2));
    const [state, setState] = useState("idle");
    const [message, setMessage] = useState(null);
    const [mode, setMode] = useState(initialMode);
    const [githubToken, setGithubToken] = useState("");
    const [rememberToken, setRememberToken] = useState(false);
    const panelId = "mission-run-task-panel";
    const isValid = useMemo(() => title.trim().length > 0 && deliverables.trim().length > 0, [title, deliverables]);
    useEffect(() => {
        if (!hasGithubConfig) {
            return;
        }
        try {
            const stored = localStorage.getItem("vibeflow.githubToken");
            if (stored) {
                setGithubToken(stored);
                setRememberToken(true);
            }
        }
        catch {
            // localStorage unavailable (private browsing, etc.)
        }
    }, [hasGithubConfig]);
    useEffect(() => {
        if (!hasGithubConfig) {
            return;
        }
        try {
            if (rememberToken && githubToken) {
                localStorage.setItem("vibeflow.githubToken", githubToken);
            }
            else if (!rememberToken) {
                localStorage.removeItem("vibeflow.githubToken");
            }
        }
        catch {
            // ignore storage failures
        }
    }, [githubToken, rememberToken, hasGithubConfig]);
    const resetForm = () => {
        setTaskId(generateTaskId());
        setTitle("");
        setObjectives("");
        setDeliverables("");
        setConfidence(DEFAULT_CONFIDENCE.toFixed(2));
    };
    const togglePanel = () => {
        setState("idle");
        setMessage(null);
        setOpen((value) => !value);
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!isValid || state === "submitting") {
            return;
        }
        setState("submitting");
        setMessage(null);
        try {
            const payload = buildPayload({ taskId, title, objectives, deliverables, confidence });
            if (mode === "github") {
                if (!hasGithubConfig) {
                    throw new Error("GitHub integration is not configured for this dashboard build.");
                }
                if (!githubToken || githubToken.trim().length === 0) {
                    throw new Error("GitHub token required to queue mission loop.");
                }
                const result = await queueTaskViaGitHub(payload, {
                    owner: githubOwner,
                    repo: githubRepo,
                    token: githubToken.trim(),
                    branch: githubBranch,
                    workflow: githubWorkflow,
                });
                setState("success");
                setMessage(`Queued ${payload.task_id} to ${result.path}`);
                onQueued?.({ taskId: payload.task_id, provider: null });
                resetForm();
                setOpen(false);
                return;
            }
            const headers = { "Content-Type": "application/json" };
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
        }
        catch (error) {
            setState("error");
            setMessage(error.message);
            console.error("[run-task] dispatch failed", error);
        }
    };
    return (_jsxs("div", { className: "run-task", children: [_jsx("button", { type: "button", className: "run-task__button", onClick: togglePanel, "aria-expanded": open, "aria-controls": open ? panelId : undefined, children: _jsx("span", { children: "Run Task" }) }), open && (_jsxs("form", { id: panelId, className: "run-task__panel", onSubmit: handleSubmit, children: [hasEndpoint && hasGithubConfig && (_jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-mode", children: "Dispatch Mode" }), _jsxs("select", { id: "run-task-mode", value: mode, onChange: (event) => setMode(event.target.value), children: [_jsx("option", { value: "mcp", children: "Local MCP Endpoint" }), _jsx("option", { value: "github", children: "GitHub Mission Loop" })] })] })), mode === "github" && hasGithubConfig && (_jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-token", children: "GitHub Token" }), _jsx("input", { id: "run-task-token", type: "password", value: githubToken, onChange: (event) => setGithubToken(event.target.value), placeholder: "ghp_xxx" }), _jsxs("p", { className: "run-task__hint", children: ["Requires a token with ", _jsx("code", { children: "repo" }), " and ", _jsx("code", { children: "workflow" }), " scopes. Stored locally only if you enable remember."] }), _jsxs("label", { className: "run-task__remember", children: [_jsx("input", { type: "checkbox", checked: rememberToken, onChange: (event) => setRememberToken(event.target.checked) }), "Remember token on this device"] }), _jsxs("p", { className: "run-task__hint", children: ["Branch: ", _jsx("strong", { children: githubBranch }), " \uFFFD Workflow: ", _jsx("strong", { children: githubWorkflow })] })] })), _jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-id", children: "Task ID" }), _jsxs("div", { className: "run-task__input-group", children: [_jsx("input", { id: "run-task-id", type: "text", value: taskId, onChange: (event) => setTaskId(event.target.value), required: true }), _jsx("button", { type: "button", onClick: () => setTaskId(generateTaskId()), children: "Regenerate" })] })] }), _jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-title", children: "Title" }), _jsx("input", { id: "run-task-title", type: "text", value: title, onChange: (event) => setTitle(event.target.value), placeholder: "Mission objective", required: true })] }), _jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-objectives", children: "Objectives" }), _jsx("textarea", { id: "run-task-objectives", value: objectives, onChange: (event) => setObjectives(event.target.value), placeholder: "One objective per line", rows: 3 })] }), _jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-deliverables", children: "Deliverables" }), _jsx("textarea", { id: "run-task-deliverables", value: deliverables, onChange: (event) => setDeliverables(event.target.value), placeholder: "Path to expected output (one per line)", rows: 2, required: true })] }), _jsxs("div", { className: "run-task__row", children: [_jsx("label", { htmlFor: "run-task-confidence", children: "Confidence" }), _jsx("input", { id: "run-task-confidence", type: "number", step: "0.01", min: "0.95", max: "1", value: confidence, onChange: (event) => setConfidence(event.target.value) })] }), message && (_jsx("p", { className: state === "error" ? "run-task__message run-task__message--error" : "run-task__message", children: message })), _jsxs("div", { className: "run-task__actions", children: [_jsx("button", { type: "button", onClick: () => setOpen(false), children: "Cancel" }), _jsx("button", { type: "submit", disabled: !isValid || state === "submitting" || (mode === "github" && !githubToken), children: state === "submitting" ? "Dispatching..." : "Queue mission" })] })] }))] }));
};
function buildPayload({ taskId, title, objectives, deliverables, confidence, }) {
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
function splitLines(value) {
    return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}
function clampConfidence(value) {
    if (!Number.isFinite(value)) {
        return DEFAULT_CONFIDENCE;
    }
    return Math.min(1, Math.max(0.95, Number(value.toFixed(2))));
}
function generateTaskId() {
    return `task/${Date.now().toString(36)}`;
}
export default RunTaskButton;
