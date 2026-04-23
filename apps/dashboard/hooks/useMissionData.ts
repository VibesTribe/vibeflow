import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentSnapshot, FailureSnapshot, MergeCandidate, TaskSnapshot } from "@core/types";
import { MissionEvent, parseEventsLog, deriveQualityMap } from "../../../src/utils/events";
import { MissionSlice, MissionAgent, buildStatusSummary, deriveSlices, mapAgent, SliceCatalog } from "../utils/mission";
import { adaptVibePilotToDashboard, ROITotals, SliceROI, SubscriptionROI, ModelROI } from "../lib/vibepilotAdapter";

// Governor API URL — local PG backend, replaces Supabase
const GOVERNOR_API = import.meta.env.VITE_GOVERNOR_API || "http://localhost:8080";
const SSE_STREAM_PATH = "/api/dashboard/stream";
const FALLBACK_POLL_MS = 15000; // fallback if SSE fails

// ETag cache — avoids re-fetching 181KB when nothing changed
let lastEtag: string | null = null;
let cachedGovData: GovernorDashboardResponse | null = null;

function resolveDashboardPath(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  if (base === "/") {
    return `/${normalized}`;
  }
  return `${base.replace(/\/$/, "")}/${normalized}`;
}

interface DashboardSnapshot {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  failures: FailureSnapshot[];
  mergeCandidates: MergeCandidate[];
  metrics: Record<string, number>;
  sliceCatalog: SliceCatalog[];
  updatedAt: string;
  roi?: {
    totals: ROITotals;
    slices: SliceROI[];
    models: ModelROI[];
    subscriptions: SubscriptionROI[];
  };
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
  roi: {
    totals: ROITotals;
    slices: SliceROI[];
    models: ModelROI[];
    subscriptions: SubscriptionROI[];
  } | null;
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

interface GovernorDashboardResponse {
  tasks: any[];
  task_runs: any[];
  models: any[];
  platforms: any[];
  orchestrator_events: any[];
  exchange_rates: any[];
}

async function fetchFromGovernor(): Promise<GovernorDashboardResponse | null> {
  try {
    const headers: Record<string, string> = {};
    if (lastEtag) {
      headers["If-None-Match"] = lastEtag;
    }
    const res = await fetch(`${GOVERNOR_API}/api/dashboard`, {
      cache: "no-store",
      headers,
    });
    if (res.status === 304) {
      // Nothing changed — reuse cached data
      return cachedGovData;
    }
    if (!res.ok) {
      console.warn(`[mission-data] governor returned ${res.status}`);
      return cachedGovData; // Fall back to cache on error
    }
    const etag = res.headers.get("ETag");
    if (etag) lastEtag = etag;
    const data = await res.json();
    cachedGovData = data;
    return data;
  } catch (err) {
    console.warn("[mission-data] governor fetch failed, using cache", err);
    return cachedGovData; // Use cached data on network error
  }
}

export function useMissionData(): MissionData {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [runMetrics, setRunMetrics] = useState<RunMetrics>(initialRunMetrics);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState<MissionLoadingState>({ snapshot: true, metrics: true, events: true });

  const mountedRef = useRef(true);
  const esRef = useRef<EventSource | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    mountedRef.current = false;
    if (esRef.current) esRef.current.close();
    if (fallbackPollRef.current) clearInterval(fallbackPollRef.current);
  }, []);

  const fetchData = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading((prev) => ({ ...prev, snapshot: true, events: true }));

    // Primary: Governor API (local PG)
    const gov = await fetchFromGovernor();
    if (!mountedRef.current) return;

    if (gov) {
      // Adapt governor data through the same adapter the dashboard was built for
      const adapted = adaptVibePilotToDashboard(
        gov.tasks || [],
        gov.task_runs || [],
        gov.models || [],
        gov.platforms || []
      );
      setSnapshot({
        tasks: adapted.tasks,
        agents: adapted.agents,
        failures: [],
        mergeCandidates: [],
        metrics: adapted.metrics,
        sliceCatalog: adapted.slices,
        roi: adapted.roi,
        updatedAt: adapted.updated_at,
      });

      // Map orchestrator events
      if (gov.orchestrator_events) {
        const mapped: MissionEvent[] = gov.orchestrator_events.map((row: any) => ({
          id: row.id,
          taskId: row.task_id || "unknown",
          type: row.event_type || "unknown",
          timestamp: row.created_at || new Date().toISOString(),
          reasonCode: row.reason || undefined,
          details: {
            ...((row.details as Record<string, unknown>) || {}),
            runnerId: row.runner_id,
            fromRunnerId: row.from_runner_id,
            toRunnerId: row.to_runner_id,
            modelId: row.model_id,
          },
        }));
        setEvents(mapped);
      }

      setLoading((prev) => ({ ...prev, snapshot: false, events: false }));
      return;
    }

    // Fallback: mock data files
    try {
      const [snapshotRes, eventsRes] = await Promise.all([
        fetch(resolveDashboardPath("data/state/dashboard.mock.json"), { cache: "no-store" }),
        fetch(resolveDashboardPath("data/state/events.log.jsonl"), { cache: "no-store" }),
      ]);

      if (snapshotRes.ok) {
        const parsed = await snapshotRes.json();
        if (mountedRef.current) {
          setSnapshot({
            tasks: parsed.tasks ?? [],
            agents: parsed.agents ?? [],
            failures: parsed.failures ?? [],
            mergeCandidates: parsed.merge_candidates ?? [],
            metrics: parsed.metrics ?? {},
            sliceCatalog: Array.isArray(parsed.slices) ? parsed.slices : [],
            updatedAt: parsed.updated_at ?? new Date().toISOString(),
          });
        }
      }

      if (eventsRes.ok) {
        const raw = await eventsRes.text();
        if (mountedRef.current) {
          setEvents(parseEventsLog(raw));
        }
      }
    } catch (error) {
      console.warn("[mission-data] mock data fetch failed", error);
    }

    if (mountedRef.current) {
      setLoading((prev) => ({ ...prev, snapshot: false, events: false }));
    }
  }, []);

  useEffect(() => {
    fetchData();

    // SSE: server pushes notifications when PG tables change.
    // On notification, do a targeted re-fetch (ETag caching still applies).
    // EventSource auto-reconnects on disconnect.
    const sseUrl = `${GOVERNOR_API}${SSE_STREAM_PATH}`;
    let sseFailed = false;

    try {
      const es = new EventSource(sseUrl);
      esRef.current = es;

      es.addEventListener("change", () => {
        // Server says something changed — re-fetch the full dashboard payload.
        // ETag ensures we skip if data hasn't actually changed.
        if (mountedRef.current) fetchData();
      });

      es.addEventListener("error", () => {
        // SSE connection failed or dropped — EventSource will auto-retry,
        // but also start a fallback poll as safety net.
        if (!sseFailed && mountedRef.current) {
          sseFailed = true;
          console.warn("[mission-data] SSE failed, falling back to polling");
          fallbackPollRef.current = setInterval(() => {
            if (mountedRef.current) fetchData();
          }, FALLBACK_POLL_MS);
        }
      });
    } catch {
      // EventSource constructor failed (e.g. old browser)
      sseFailed = true;
      fallbackPollRef.current = setInterval(() => {
        if (mountedRef.current) fetchData();
      }, FALLBACK_POLL_MS);
    }

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (fallbackPollRef.current) {
        clearInterval(fallbackPollRef.current);
        fallbackPollRef.current = null;
      }
    };
  }, [fetchData]);

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
    fetchData();
  }, [fetchData]);

  return {
    snapshot,
    events,
    runMetrics,
    slices,
    agents: mappedAgents,
    statusSummary,
    qualityByTask,
    tokenUsage,
    roi: snapshot.roi || null,
    loading,
    refresh,
  };
}
