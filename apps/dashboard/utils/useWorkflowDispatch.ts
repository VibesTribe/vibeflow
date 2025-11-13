import { useCallback, useMemo, useState } from "react";

type DispatchStatus = "idle" | "pending" | "success" | "error";

export interface WorkflowDispatchOptions {
  workflow: string;
  inputs?: Record<string, string | undefined | null>;
  ref?: string;
}

export interface WorkflowDispatchResult {
  trigger: (options: WorkflowDispatchOptions) => Promise<void>;
  status: DispatchStatus;
  error: string | null;
  available: boolean;
  reset: () => void;
}

const API_BASE = "https://api.github.com";
const defaultRepo = import.meta.env.VITE_REPO ?? "VibesTribe/vibeflow";
const defaultRef = import.meta.env.VITE_BRANCH ?? "main";
const defaultToken = import.meta.env.VITE_GH_TOKEN ?? "";

function sanitizeInputs(record: Record<string, string | undefined | null> = {}): Record<string, string> {
  const next: Record<string, string> = {};
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const trimmed = String(value).trim();
    if (trimmed.length === 0) return;
    next[key] = trimmed;
  });
  return next;
}

export function useWorkflowDispatch(repo = defaultRepo, token = defaultToken): WorkflowDispatchResult {
  const [status, setStatus] = useState<DispatchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const available = useMemo(() => Boolean(repo && token), [repo, token]);

  const trigger = useCallback(
    async ({ workflow, inputs, ref }: WorkflowDispatchOptions) => {
      if (!available) {
        throw new Error("Workflow dispatch is not configured. Set VITE_REPO and VITE_GH_TOKEN.");
      }
      if (!workflow) {
        throw new Error("Workflow file name is required.");
      }
      setStatus("pending");
      setError(null);
      try {
        const payload = {
          ref: ref ?? defaultRef,
          inputs: sanitizeInputs(inputs),
        };

        const response = await fetch(`${API_BASE}/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `GitHub dispatch failed (${response.status})`);
        }
        setStatus("success");
      } catch (dispatchError) {
        const message = dispatchError instanceof Error ? dispatchError.message : String(dispatchError);
        setError(message);
        setStatus("error");
        throw dispatchError;
      }
    },
    [available, repo, token],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return { trigger, status, error, available, reset };
}

