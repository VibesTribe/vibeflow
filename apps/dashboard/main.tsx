/**
 * vibeflow-meta:
 * id: apps/dashboard/main.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: dashboard-app
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:dashboard-app */
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import SliceDock from "./components/SliceDock";
import AgentHangar from "./components/AgentHangar";
import AgentOverviewModal from "./components/AgentOverviewModal";
import ModelAnalyticsView from "../../src/dashboard/ModelAnalyticsView";
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

const DashboardApp: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [runMetrics, setRunMetrics] = useState<RunMetrics>(initialRunMetrics);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentSnapshot | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSnapshot() {
      try {
        const response = await fetch("/data/state/task.state.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load snapshot (${response.status})`);
        }
        const data = await response.json();
        if (cancelled) return;
        setSnapshot({
          tasks: data.tasks ?? [],
          agents: data.agents ?? [],
          failures: data.failures ?? [],
          mergeCandidates: data.merge_candidates ?? [],
          metrics: data.metrics ?? {},
          updatedAt: data.updated_at ?? new Date().toISOString(),
        });
      } catch (error) {
        console.warn("[dashboard] snapshot fetch failed", error);
      } finally {
        if (!cancelled) {
          setSnapshotLoading(false);
        }
      }
    }

    loadSnapshot();
    const interval = setInterval(loadSnapshot, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRunMetrics() {
      try {
        const response = await fetch("/data/metrics/run_metrics.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load metrics (${response.status})`);
        }
        const data = await response.json();
        if (cancelled) return;
        setRunMetrics({
          runs: Array.isArray(data.runs) ? data.runs : [],
          updated_at: data.updated_at ?? new Date().toISOString(),
        });
      } catch (error) {
        console.warn("[dashboard] metrics fetch failed", error);
      } finally {
        if (!cancelled) {
          setMetricsLoading(false);
        }
      }
    }

    loadRunMetrics();
    const interval = setInterval(loadRunMetrics, 90_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const isLoading = snapshotLoading || metricsLoading;

  return (
    <div className="dashboard-grid">
      <aside className="dashboard-grid__sidebar">
        <SliceDock
          tasks={snapshot.tasks}
          failures={snapshot.failures}
          metrics={snapshot.metrics}
          updatedAt={snapshot.updatedAt}
          isLoading={isLoading}
          onSelectTask={setSelectedTask}
        />
      </aside>
      <main className="dashboard-grid__main">
        <ModelAnalyticsView runs={runMetrics.runs} updatedAt={runMetrics.updated_at} loading={metricsLoading} />
        <AgentHangar
          agents={snapshot.agents}
          selectedAgentId={selectedAgent?.id ?? null}
          onSelectAgent={setSelectedAgent}
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
/* @endeditable */
