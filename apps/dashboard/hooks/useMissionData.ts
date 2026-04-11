import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentSnapshot, FailureSnapshot, MergeCandidate, TaskSnapshot } from "@core/types";
import { MissionEvent, parseEventsLog, deriveQualityMap } from "../../../src/utils/events";
import { MissionSlice, MissionAgent, buildStatusSummary, deriveSlices, mapAgent, SliceCatalog } from "../utils/mission";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { adaptVibePilotToDashboard, ROITotals, SliceROI, SubscriptionROI, ModelROI } from "../lib/vibepilotAdapter";
import { RealtimeChannel } from "@supabase/supabase-js";

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

export function useMissionData(): MissionData {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [runMetrics, setRunMetrics] = useState<RunMetrics>(initialRunMetrics);
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [loading, setLoading] = useState<MissionLoadingState>({ snapshot: true, metrics: true, events: true });

  const channelsRef = useRef<RealtimeChannel[]>([]);
  const mountedRef = useRef(true);

  useEffect(() => () => {
    mountedRef.current = false;
    channelsRef.current.forEach(ch => ch.unsubscribe());
  }, []);

  const fetchInitialData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    if (isSupabaseConfigured() && supabase) {
      setLoading((prev) => ({ ...prev, snapshot: true, events: true }));
      
      const [tasksRes, runsRes, modelsRes, platformsRes, eventsRes] = await Promise.all([
        supabase.from("tasks").select("*").order("updated_at", { ascending: false }).limit(100),
        supabase.from("task_runs").select("*").order("started_at", { ascending: false }).limit(500),
        supabase.from("models").select("*").in("status", ["active", "paused"]),
        supabase.from("platforms").select("*").in("status", ["active", "paused"]),
        supabase
          .from("orchestrator_events")
          .select("id, event_type, task_id, runner_id, from_runner_id, to_runner_id, model_id, reason, details, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      if (!mountedRef.current) return;

      if (!tasksRes.error && !runsRes.error) {
        const adapted = adaptVibePilotToDashboard(
          tasksRes.data || [],
          runsRes.data || [],
          modelsRes.data || [],
          platformsRes.data || []
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
      }

      if (!eventsRes.error && eventsRes.data) {
        const mapped: MissionEvent[] = eventsRes.data.map((row) => ({
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
    } else {
      setLoading((prev) => ({ ...prev, snapshot: true, events: true }));
      try {
        const [snapshotRes, eventsRes] = await Promise.all([
          fetch(resolveDashboardPath("data/state/dashboard.mock.json"), { cache: "no-store" }),
          fetch(resolveDashboardPath("data/state/events.log.jsonl"), { cache: "no-store" }),
        ]);
        
        if (snapshotRes.ok) {
          const parsed = await snapshotRes.json();
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
        
        if (eventsRes.ok) {
          const raw = await eventsRes.text();
          setEvents(parseEventsLog(raw));
        }
      } catch (error) {
        console.warn("[mission-data] fallback fetch failed", error);
      }
      setLoading((prev) => ({ ...prev, snapshot: false, events: false }));
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    if (!isSupabaseConfigured() || !supabase) return;

    const sb = supabase;

    const handleSnapshotUpdate = async () => {
      const [tasksRes, runsRes, modelsRes, platformsRes] = await Promise.all([
        sb.from("tasks").select("*").order("updated_at", { ascending: false }).limit(100),
        sb.from("task_runs").select("*").order("started_at", { ascending: false }).limit(500),
        sb.from("models").select("*").in("status", ["active", "paused"]),
        sb.from("platforms").select("*").in("status", ["active", "paused"]),
      ]);

      if (!mountedRef.current) return;

      if (!tasksRes.error && !runsRes.error) {
        const adapted = adaptVibePilotToDashboard(
          tasksRes.data || [],
          runsRes.data || [],
          modelsRes.data || [],
          platformsRes.data || []
        );
        setSnapshot(prev => ({
          ...prev,
          tasks: adapted.tasks,
          agents: adapted.agents,
          metrics: adapted.metrics,
          sliceCatalog: adapted.slices,
          roi: adapted.roi,
          updatedAt: adapted.updated_at,
        }));
      }
    };

    const handleEventsUpdate = async () => {
      const { data, error } = await sb
        .from("orchestrator_events")
        .select("id, event_type, task_id, runner_id, from_runner_id, to_runner_id, model_id, reason, details, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!mountedRef.current || error || !data) return;

      const mapped: MissionEvent[] = data.map((row) => ({
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
    };

    const tasksChannel = sb
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, handleSnapshotUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_runs" }, handleSnapshotUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "models" }, handleSnapshotUpdate)
      .on("postgres_changes", { event: "*", schema: "public", table: "platforms" }, handleSnapshotUpdate)
      .subscribe();

    const eventsChannel = sb
      .channel("dashboard-events")
      .on("postgres_changes", { event: "*", schema: "public", table: "orchestrator_events" }, handleEventsUpdate)
      .subscribe();

    channelsRef.current = [tasksChannel, eventsChannel];

    return () => {
      tasksChannel.unsubscribe();
      eventsChannel.unsubscribe();
    };
  }, [fetchInitialData]);

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
    fetchInitialData();
  }, [fetchInitialData]);

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
