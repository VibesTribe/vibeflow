import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentSnapshot, FailureSnapshot, MergeCandidate, TaskSnapshot } from "@core/types";
import { MissionEvent, parseEventsLog, deriveQualityMap } from "../../../src/utils/events";
import { MissionSlice, MissionAgent, buildStatusSummary, deriveSlices, mapAgent } from "../utils/mission";

interface DashboardSnapshot {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  failures: FailureSnapshot[];
  mergeCandidates: MergeCandidate[];
  metrics: Record<string, number>;
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
  updatedAt: new Date().toISOString(),
};

const initialRunMetrics: RunMetrics = {
  runs: [],
  updated_at: new Date().toISOString(),
};

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
      const response = await fetch("/data/state/dashboard.mock.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load snapshot (${response.status})`);
      }
      const raw = await response.text();
      if (raw === snapshotRawRef.current) {
        return;
      }
      snapshotRawRef.current = raw;
      const parsed = JSON.parse(raw);
      if (!mountedRef.current) return;
      setSnapshot({
        tasks: parsed.tasks ?? [],
        agents: parsed.agents ?? [],
        failures: parsed.failures ?? [],
        mergeCandidates: parsed.merge_candidates ?? [],
        metrics: parsed.metrics ?? {},
        updatedAt: parsed.updated_at ?? new Date().toISOString(),
      });
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
      const response = await fetch("/data/metrics/run_metrics.json", { cache: "no-store" });
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
      const response = await fetch("/data/state/events.log.jsonl", { cache: "no-store" });
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
  const slices = useMemo(() => deriveSlices(snapshot.tasks, events, snapshot.agents), [snapshot.tasks, events, snapshot.agents]);
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
