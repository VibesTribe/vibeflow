import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import SliceDock from "./components/SliceDock";
import AgentHangar from "./components/AgentHangar";
import AgentOverviewModal from "./components/AgentOverviewModal";
import Timeline from "./components/Timeline";
import RunTaskButton from "./components/RunTaskButton";
import ModelAnalyticsView from "../../src/dashboard/ModelAnalyticsView";
import { parseEventsLog, deriveQualityMap } from "../../src/utils/events";
import { TaskSnapshot, AgentSnapshot, FailureSnapshot, MergeCandidate } from "@core/types";

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

const SNAPSHOT_POLL_MS = 10_000;
const METRICS_POLL_MS = 30_000;
const EVENTS_POLL_MS = 10_000;

const DashboardApp: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [runMetrics, setRunMetrics] = useState<RunMetrics>(initialRunMetrics);
  const [events, setEvents] = useState(parseEventsLog(""));

  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);

  const [selectedAgent, setSelectedAgent] = useState<AgentSnapshot | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskSnapshot | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  const loadSnapshot = useCallback(async () => {
    if (!mountedRef.current) return;
    setSnapshotLoading(true);
    try {
      const response = await fetch("/data/state/task.state.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load snapshot (${response.status})`);
      }
      const data = await response.json();
      if (!mountedRef.current) return;
      setSnapshot({
        tasks: data.tasks ?? [],
        agents: data.agents ?? [],
        failures: data.failures ?? [],
        mergeCandidates: data.merge_candidates ?? [],
        metrics: data.metrics ?? {},
        updatedAt: data.updated_at ?? new Date().toISOString(),
      });
    } catch (error) {
      if (mountedRef.current) {
        console.warn("[dashboard] snapshot fetch failed", error);
      }
    } finally {
      if (mountedRef.current) {
        setSnapshotLoading(false);
      }
    }
  }, []);

  const loadRunMetrics = useCallback(async () => {
    if (!mountedRef.current) return;
    setMetricsLoading(true);
    try {
      const response = await fetch("/data/metrics/run_metrics.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load metrics (${response.status})`);
      }
      const data = await response.json();
      if (!mountedRef.current) return;
      setRunMetrics({
        runs: Array.isArray(data.runs) ? data.runs : [],
        updated_at: data.updated_at ?? new Date().toISOString(),
      });
    } catch (error) {
      if (mountedRef.current) {
        console.warn("[dashboard] metrics fetch failed", error);
      }
    } finally {
      if (mountedRef.current) {
        setMetricsLoading(false);
      }
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!mountedRef.current) return;
    setEventsLoading(true);
    try {
      const response = await fetch("/data/state/events.log.jsonl", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to load events (${response.status})`);
      }
      const text = await response.text();
      if (!mountedRef.current) return;
      setEvents(parseEventsLog(text));
    } catch (error) {
      if (mountedRef.current) {
        console.warn("[dashboard] events fetch failed", error);
      }
    } finally {
      if (mountedRef.current) {
        setEventsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
    const interval = setInterval(() => {
      loadSnapshot();
    }, SNAPSHOT_POLL_MS);
    return () => clearInterval(interval);
  }, [loadSnapshot]);

  useEffect(() => {
    loadRunMetrics();
    const interval = setInterval(() => {
      loadRunMetrics();
    }, METRICS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadRunMetrics]);

  useEffect(() => {
    loadEvents();
    const interval = setInterval(() => {
      loadEvents();
    }, EVENTS_POLL_MS);
    return () => clearInterval(interval);
  }, [loadEvents]);

  const qualityByTask = useMemo(() => deriveQualityMap(events), [events]);
  const isLoading = snapshotLoading || metricsLoading || eventsLoading;

  const handleTaskQueued = useCallback(() => {
    loadSnapshot();
    loadEvents();
  }, [loadSnapshot, loadEvents]);

  return (
    <div className="dashboard-grid">
      <aside className="dashboard-grid__sidebar">
        <SliceDock
          tasks={snapshot.tasks}
          failures={snapshot.failures}
          metrics={snapshot.metrics}
          updatedAt={snapshot.updatedAt}
          isLoading={isLoading}
          onSelectTask={(task) => setSelectedTask(task)}
        />
      </aside>
      <main className="dashboard-grid__main">
        <div className="dashboard-grid__topbar">
          <div>
            <h1>Mission Control</h1>
            <p className="dashboard-grid__subtitle">Live telemetry and mission automation</p>
          </div>
          <RunTaskButton onQueued={handleTaskQueued} />
        </div>
        <ModelAnalyticsView runs={runMetrics.runs} updatedAt={runMetrics.updated_at} loading={metricsLoading} />
        <Timeline tasks={snapshot.tasks} isLoading={snapshotLoading} qualityByTask={qualityByTask} />
        <AgentHangar
          agents={snapshot.agents}
          selectedAgentId={selectedAgent?.id ?? null}
          onSelectAgent={setSelectedAgent}
          isLoading={snapshotLoading}
        />
      </main>
      <aside className="dashboard-grid__detail">
        <AgentOverviewModal
          branches={snapshot.mergeCandidates}
          failures={snapshot.failures}
          selectedAgent={selectedAgent}
          selectedTask={selectedTask}
          onClearSelection={() => {
            setSelectedAgent(null);
            setSelectedTask(null);
          }}
        />
      </aside>
    </div>
  );
};

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>
);
