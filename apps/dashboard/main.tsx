import "./styles.css";
import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import MissionHeader from "./components/MissionHeader";
import SliceDockPanel from "./components/SliceDockPanel";
import AgentHangarPanel from "./components/AgentHangarPanel";
import SliceHub from "./components/SliceHub";
import MissionModals, { MissionModalState } from "./components/modals/MissionModals";
import RunTaskButton from "./components/RunTaskButton";
import { useMissionData } from "./hooks/useMissionData";
import { MissionSlice } from "./utils/mission";

const DashboardApp: React.FC = () => {
  const { snapshot, events, slices, agents, statusSummary, tokenUsage, loading, refresh } = useMissionData();
  const [modal, setModal] = useState<MissionModalState>({ type: null });

  const snapshotTime = useMemo(() => new Date(snapshot.updatedAt).toLocaleTimeString(), [snapshot.updatedAt]);

  const handleOpenDocs = () => setModal({ type: "docs" });
  const handleOpenLogs = () => setModal({ type: "logs" });
  const handleOpenModels = () => setModal({ type: "models" });
  const handleOpenAdd = () => setModal({ type: "add" });
  const handleSelectAgent = (agent: (typeof agents)[number]) => setModal({ type: "agent", agent });
  const handleSelectSlice = (slice: MissionSlice) => setModal({ type: "slice", slice });

  const handleCloseModal = () => setModal({ type: null });

  return (
    <div className="mission-root">
      <SliceDockPanel
        slices={slices}
        loading={loading.snapshot}
        onViewDocs={handleOpenDocs}
        onViewLogs={handleOpenLogs}
        onSelectSlice={handleSelectSlice}
      />
      <main className="mission-main">
        <div className="mission-main__header">
          <MissionHeader statusSummary={statusSummary} snapshotTime={snapshotTime} tokenUsage={tokenUsage} />
          <RunTaskButton onQueued={refresh} />
        </div>
        <SliceHub slices={slices} onSelectSlice={handleSelectSlice} onSelectAgent={handleSelectAgent} />
      </main>
      <AgentHangarPanel
        agents={agents}
        loading={loading.snapshot}
        onViewAll={handleOpenModels}
        onAdd={handleOpenAdd}
        onSelectAgent={handleSelectAgent}
      />
      <MissionModals modal={modal} onClose={handleCloseModal} events={events} agents={agents} />
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

