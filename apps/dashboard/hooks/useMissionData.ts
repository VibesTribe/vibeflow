import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentSnapshot, FailureSnapshot, MergeCandidate, TaskSnapshot, TaskStatus } from "@core/types";
import { MissionEvent, parseEventsLog, deriveQualityMap } from "../../../src/utils/events";
import { MissionSlice, MissionAgent, buildStatusSummary, deriveSlices, mapAgent, SliceCatalog } from "../utils/mission";
import { resolveDashboardPath } from "../utils/paths";

interface DashboardSnapshot {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  failures: FailureSnapshot[];
  mergeCandidates: MergeCandidate[];
  metrics: Record<string, number>;
  sliceCatalog: SliceCatalog[];
  updatedAt: string;
}

interface RunMetricEntry {
  id: string;
  started_at: string;
  status: string;
  notes?: string;
}

interface RunMetrics {
  runs: RunMetricEntry[];
  updated_at: string;
}

interface MissionLoadingState {
  snapshot: boolean;
  metrics: boolean;
  events: boolean;
}

export interface MissionData {
  snapshot: DashboardSnapshot;
  events: MissionEvent[];
  runMetrics: RunMetrics;
  slices: MissionSlice[];
  agents: MissionAgent[];
  statusSummary: ReturnType<typeof buildStatusSummary>;
  qualityByTask: Record<string, string>;
  tokenUsage: number;
  loading: MissionLoadingState;
  refresh: () => void;
}

const initialSnapshot: DashboardSnapshot = {
  tasks: [],
  agents: [],
  failures: [],
  mergeCandidates: [],
  metrics: {},
  sliceCatalog: [],
  updatedAt: new Date().toISOString(),
};

const initialRunMetrics: RunMetrics = {
  runs: [],
  updated_at: new Date().toISOString(),
};

const SNAPSHOT_SOURCES = ["data/state/task.state.json", "data/state/dashboard.mock.json"];
const SNAPSHOT_POLL_MS = 5_000;
const METRICS_POLL_MS = 25_000;
const EVENTS_POLL_MS = 5_000;

export function useMissionData(): MissionData {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [runMetrics, setRunMetrics] = useState<RunMetrics>(initialRunMetrics);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState<MissionLoadingState>({ snapshot: true, metrics: true, events: true });

  const snapshotRawRef = useRef<string>("");
  const metricsRawRef = useRef<string>("");
  const eventsRawRef = useRef<string>("");
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const fetchSnapshot = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading((prev) => ({ ...prev, snapshot: true }));
    try {
      const loaded = await loadFirstAvailableSnapshot();
      if (!loaded) {
        throw new Error("No snapshot source available");
      }
      const changeToken = `${loaded.source}:${loaded.raw}`;
      if (changeToken === snapshotRawRef.current) {
        return;
      }
      snapshotRawRef.current = changeToken;
      if (!mountedRef.current) return;
      setSnapshot(loaded.snapshot);
    } catch (error) {
      console.warn("[mission-data] snapshot fetch failed", error);
    } finally {
      if (mountedRef.current) {
        setLoading((prev) => ({ ...prev, snapshot: false }));
      }
    }
  }, []);

  const fetchRunMetrics = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading((prev) => ({ ...prev, metrics: true }));
    try {
      const response = await fetch(resolveDashboardPath("data/metrics/run_metrics.json"), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load metrics (${response.status})`);
      }
      const raw = await response.text();
      if (raw === metricsRawRef.current) {
        return;
      }
      metricsRawRef.current = raw;
      const parsed = JSON.parse(raw);
      if (!mountedRef.current) return;
      setRunMetrics({
        runs: Array.isArray(parsed.runs) ? parsed.runs : [],
        updated_at: parsed.updated_at ?? new Date().toISOString(),
      });
    } catch (error) {
      console.warn("[mission-data] metrics fetch failed", error);
    } finally {
      if (mountedRef.current) {
        setLoading((prev) => ({ ...prev, metrics: false }));
      }
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading((prev) => ({ ...prev, events: true }));
    try {
      const response = await fetch(resolveDashboardPath("data/state/events.log.jsonl"), { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`);
      }
      const raw = await response.text();
      if (raw === eventsRawRef.current) {
        return;
      }
      eventsRawRef.current = raw;
      if (!mountedRef.current) return;
      setEvents(parseEventsLog(raw));
    } catch (error) {
      console.warn("[mission-data] events fetch failed", error);
    } finally {
      if (mountedRef.current) {
        setLoading((prev) => ({ ...prev, events: false }));
      }
    }
  }, []);

  useEffect(() => {
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, SNAPSHOT_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchSnapshot]);

  useEffect(() => {
    fetchRunMetrics();
    const interval = setInterval(fetchRunMetrics, METRICS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchRunMetrics]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, EVENTS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const mappedAgents = useMemo(() => snapshot.agents.map(mapAgent), [snapshot.agents]);
  const slices = useMemo(() => deriveSlices(snapshot.tasks, events, snapshot.agents, snapshot.sliceCatalog), [snapshot.tasks, events, snapshot.agents, snapshot.sliceCatalog]);
  const statusSummary = useMemo(() => buildStatusSummary(snapshot.tasks), [snapshot.tasks]);
  const qualityByTask = useMemo(() => deriveQualityMap(events), [events]);
  const tokenUsage = useMemo(() => {
    if (typeof snapshot.metrics?.tokens_used === "number") {
      return snapshot.metrics.tokens_used;
    }
    const totalRuns = runMetrics.runs.length;
    return totalRuns * 1_000;
  }, [snapshot.metrics, runMetrics.runs]);

  const refresh = useCallback(() => {
    fetchSnapshot();
    fetchRunMetrics();
    fetchEvents();
  }, [fetchSnapshot, fetchRunMetrics, fetchEvents]);

  return {
    snapshot,
    events,
    runMetrics,
    slices,
    agents: mappedAgents,
    statusSummary,
    qualityByTask,
    tokenUsage,
    loading,
    refresh,
  };
}

async function loadFirstAvailableSnapshot(): Promise<{ raw: string; snapshot: DashboardSnapshot; source: string } | null> {
  const attempts: string[] = [];
  for (const source of SNAPSHOT_SOURCES) {
    try {
      const response = await fetch(resolveDashboardPath(source), { cache: "no-store" });
      if (!response.ok) {
        attempts.push(`${source} (${response.status})`);
        continue;
      }
      const raw = await response.text();
      const parsed = normalizeSnapshotPayload(raw);
      return { raw, snapshot: parsed, source };
    } catch (error) {
      attempts.push(`${source} (${(error as Error).message})`);
    }
  }
  if (attempts.length > 0) {
    console.warn("[mission-data] snapshot sources unavailable:", attempts.join("; "));
  }
  return null;
}

function normalizeSnapshotPayload(raw: string): DashboardSnapshot {
  const parsed = JSON.parse(raw);
  const updatedAt = parsed.updated_at ?? parsed.updatedAt ?? new Date().toISOString();
  const sliceCatalog: SliceCatalog[] = Array.isArray(parsed.slices) ? parsed.slices.map(normalizeSliceCatalog) : [];
  const failures: FailureSnapshot[] = Array.isArray(parsed.failures) ? parsed.failures.map(normalizeFailure) : [];
  const mergeCandidates: MergeCandidate[] = Array.isArray(parsed.merge_candidates ?? parsed.mergeCandidates)
    ? (parsed.merge_candidates ?? parsed.mergeCandidates).map(normalizeMergeCandidate)
    : [];

  return {
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(normalizeTaskSnapshot).filter(Boolean) : [],
    agents: Array.isArray(parsed.agents) ? parsed.agents.map(normalizeAgentSnapshot).filter(Boolean) : [],
    failures,
    mergeCandidates,
    metrics: parsed.metrics ?? {},
    sliceCatalog,
    updatedAt,
  };
}

function normalizeTaskSnapshot(entry: Record<string, unknown>): TaskSnapshot {
  const id = readString(entry, ["id", "taskId", "task_id"]) ?? `task-${Math.random().toString(36).slice(2, 8)}`;
  const title = readString(entry, ["title", "name"]) ?? id;
  const status = (readString(entry, ["status"]) as TaskStatus | null) ?? "assigned";
  const confidence = readNumber(entry, ["confidence"], 0.75);
  const updatedAt = readString(entry, ["updatedAt", "updated_at"]) ?? new Date().toISOString();
  const owner = readString(entry, ["owner", "agent", "provider"]);
  const sliceId = readString(entry, ["sliceId", "slice_id"]);
  const taskNumber = readString(entry, ["taskNumber", "task_number"]);
  const dependencies = readStringArray(entry, ["dependencies", "depends_on"]);
  const packet = readPacket(entry);
  const summary = readString(entry, ["summary", "description"]);
  const metrics = readMetrics(entry);
  const lessons = Array.isArray(entry["lessons"]) ? (entry["lessons"] as TaskSnapshot["lessons"]) : [];

  return {
    id,
    title,
    status,
    confidence,
    updatedAt,
    owner: owner ?? undefined,
    sliceId: sliceId ?? undefined,
    taskNumber: taskNumber ?? undefined,
    dependencies: dependencies.length ? dependencies : undefined,
    packet: packet ?? undefined,
    summary: summary ?? undefined,
    metrics,
    lessons: lessons ?? [],
  };
}

function normalizeAgentSnapshot(entry: Record<string, unknown>): AgentSnapshot | null {
  const id = readString(entry, ["id", "agentId"]);
  const name = readString(entry, ["name", "label"]);
  if (!id || !name) {
    return null;
  }
  const status = readString(entry, ["status"]) ?? "ready";
  const summary = readString(entry, ["summary", "description"]) ?? "";
  const updatedAt = readString(entry, ["updatedAt", "updated_at"]) ?? new Date().toISOString();

  return {
    id,
    name,
    status,
    summary,
    updatedAt,
    logo: readString(entry, ["logo"]),
    tier: readString(entry, ["tier"]),
    cooldownReason: readString(entry, ["cooldownReason", "cooldown_reason"]),
    costPerRunUsd: readNumber(entry, ["costPerRunUsd", "cost_per_run"]),
    vendor: readString(entry, ["vendor"]),
    capability: readString(entry, ["capability"]),
    contextWindowTokens: readNumber(entry, ["contextWindowTokens", "context_tokens"]),
    effectiveContextWindowTokens: readNumber(entry, ["effectiveContextWindowTokens", "effective_tokens"]),
    cooldownExpiresAt: readString(entry, ["cooldownExpiresAt", "cooldown_expires_at"]),
    creditStatus: (readString(entry, ["creditStatus"]) as AgentSnapshot["creditStatus"]) ?? undefined,
    rateLimitWindowSeconds: readNumber(entry, ["rateLimitWindowSeconds", "rate_limit_seconds"]),
    costPer1kTokensUsd: readNumber(entry, ["costPer1kTokensUsd", "cost_per_1k"]),
    warnings: Array.isArray(entry["warnings"]) ? (entry["warnings"] as string[]) : [],
  };
}

function normalizeSliceCatalog(entry: Record<string, unknown>): SliceCatalog {
  return {
    id: readString(entry, ["id"]) ?? `slice-${Math.random().toString(36).slice(2, 8)}`,
    name: readString(entry, ["name", "label"]) ?? "Slice",
    accent: readString(entry, ["accent"]) ?? undefined,
    tokens: readNumber(entry, ["tokens"]),
    tasksTotal: readNumber(entry, ["tasksTotal", "tasks_total"]),
    tasksDone: readNumber(entry, ["tasksDone", "tasks_done"]),
  };
}

function normalizeFailure(entry: Record<string, unknown>): FailureSnapshot {
  return {
    id: readString(entry, ["id"]) ?? `failure-${Math.random().toString(36).slice(2, 8)}`,
    title: readString(entry, ["title"]) ?? "Failure",
    summary: readString(entry, ["summary"]) ?? "",
    reasonCode: readString(entry, ["reasonCode", "reason_code"]) ?? "",
  };
}

function normalizeMergeCandidate(entry: Record<string, unknown>): MergeCandidate {
  return {
    branch: readString(entry, ["branch"]) ?? "unknown",
    title: readString(entry, ["title"]) ?? "Pending merge",
    summary: readString(entry, ["summary"]) ?? "",
    checklist: Array.isArray(entry["checklist"]) ? (entry["checklist"] as boolean[]) : [],
  };
}

function readPacket(entry: Record<string, unknown>): TaskSnapshot["packet"] | null {
  const packet = entry["packet"];
  if (!packet || typeof packet !== "object") {
    return null;
  }
  const prompt = readString(packet as Record<string, unknown>, ["prompt"]);
  const attachments = Array.isArray((packet as Record<string, unknown>)["attachments"])
    ? ((packet as Record<string, unknown>)["attachments"] as Record<string, unknown>[])
        .map((attachment) => {
          const label = readString(attachment, ["label", "name"]);
          const href = readString(attachment, ["href", "url"]);
          if (!label || !href) return null;
          return { label, href };
        })
        .filter((entry): entry is { label: string; href: string } => Boolean(entry))
    : undefined;

  if (!prompt && !attachments) {
    return null;
  }

  return {
    prompt: prompt ?? "",
    attachments,
  };
}

function readMetrics(entry: Record<string, unknown>): TaskSnapshot["metrics"] | undefined {
  const metrics = entry["metrics"];
  if (!metrics || typeof metrics !== "object") return undefined;
  const tokensUsed = readNumber(metrics as Record<string, unknown>, ["tokensUsed", "tokens_used"]);
  const runtimeSeconds = readNumber(metrics as Record<string, unknown>, ["runtimeSeconds", "runtime_seconds"]);
  const costUsd = readNumber(metrics as Record<string, unknown>, ["costUsd", "cost_usd"]);
  const hasMetrics = [tokensUsed, runtimeSeconds, costUsd].some((value) => Number.isFinite(value));
  if (!hasMetrics) return undefined;
  return {
    tokensUsed: Number.isFinite(tokensUsed) ? tokensUsed : undefined,
    runtimeSeconds: Number.isFinite(runtimeSeconds) ? runtimeSeconds : undefined,
    costUsd: Number.isFinite(costUsd) ? costUsd : undefined,
  };
}

function readString(entry: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function readNumber(entry: Record<string, unknown>, keys: string[], fallback?: number): number {
  for (const key of keys) {
    const value = entry[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return fallback !== undefined ? fallback : Number.NaN;
}

function readStringArray(entry: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const value = entry[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  }
  return [];
}




