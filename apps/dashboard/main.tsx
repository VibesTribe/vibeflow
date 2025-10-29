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
import OverviewStrip from "./components/OverviewStrip";
import Timeline from "./components/Timeline";
import AgentView from "./components/AgentView";
import Failures from "./components/Failures";
import LearningFeed from "./components/LearningFeed";
import ReadyToMerge from "./components/ReadyToMerge";
import { TaskSnapshot, AgentSnapshot, FailureSnapshot, MergeCandidate } from "@core/types";

interface DashboardSnapshot {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  failures: FailureSnapshot[];
  mergeCandidates: MergeCandidate[];
  metrics: Record<string, number>;
  updatedAt: string;
}

const initialSnapshot: DashboardSnapshot = {
  tasks: [],
  agents: [],
  failures: [],
  mergeCandidates: [],
  metrics: {},
  updatedAt: new Date().toISOString(),
};

const DashboardApp: React.FC = () => {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(initialSnapshot);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchSnapshot() {
      try {
        const response = await fetch("/data/state/task.state.json", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load snapshot (${response.status})`);
        }
        const data = await response.json();
        setSnapshot({
          tasks: data.tasks ?? [],
          agents: data.agents ?? [],
          failures: data.failures ?? [],
          mergeCandidates: data.merge_candidates ?? [],
          metrics: data.metrics ?? {},
          updatedAt: data.updated_at ?? new Date().toISOString(),
        });
      } catch (error) {
        console.warn("dashboard snapshot fallback", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard">
      <section className="panel" style={{ gridColumn: "1 / span 3" }}>
        <OverviewStrip
          metrics={snapshot.metrics}
          updatedAt={snapshot.updatedAt}
          isLoading={isLoading}
        />
      </section>
      <section className="panel" style={{ gridColumn: "1 / span 2" }}>
        <Timeline tasks={snapshot.tasks} isLoading={isLoading} />
      </section>
      <section className="panel">
        <AgentView agents={snapshot.agents} />
      </section>
      <section className="panel">
        <Failures failures={snapshot.failures} />
      </section>
      <section className="panel">
        <LearningFeed tasks={snapshot.tasks} />
      </section>
      <section className="panel">
        <ReadyToMerge candidates={snapshot.mergeCandidates} />
      </section>
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
