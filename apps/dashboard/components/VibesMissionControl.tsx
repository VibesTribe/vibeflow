import React, { useEffect, useMemo, useState } from "react";
import MissionHeader from "./MissionHeader";
import SliceDockPanel from "./SliceDockPanel";
import AgentHangarPanel from "./AgentHangarPanel";
import SliceHub from "./SliceHub";
import MissionModals, { MissionModalState } from "./modals/MissionModals";
import { useMissionData } from "../hooks/useMissionData";
import { MissionAgent, MissionSlice } from "../utils/mission";

const VibesMissionControl: React.FC = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const targetBody = document.querySelector("body#dummybodyid") || document.body;

    const originalHtmlOverflow = html.style.getPropertyValue("overflow");
    const originalHtmlPriority = html.style.getPropertyPriority("overflow");
    const originalBodyOverflow = targetBody.style.getPropertyValue("overflow");
    const originalBodyPriority = targetBody.style.getPropertyPriority("overflow");

    html.style.setProperty("overflow", "hidden", "important");
    targetBody.style.setProperty("overflow", "hidden", "important");

    return () => {
      if (originalHtmlOverflow) {
        html.style.setProperty("overflow", originalHtmlOverflow, originalHtmlPriority);
      } else {
        html.style.removeProperty("overflow");
      }
      if (originalBodyOverflow) {
        targetBody.style.setProperty("overflow", originalBodyOverflow, originalBodyPriority);
      } else {
        targetBody.style.removeProperty("overflow");
      }
    };
  }, []);

  const { snapshot, events, slices, agents, statusSummary, tokenUsage, loading } = useMissionData();
  const [modal, setModal] = useState<MissionModalState>({ type: null });

  const snapshotTime = useMemo(() => {
    if (!snapshot.updatedAt) {
      return "-";
    }
    return new Date(snapshot.updatedAt).toLocaleTimeString();
  }, [snapshot.updatedAt]);

  const handleOpenDocs = () => setModal({ type: "docs" });
  const handleOpenLogs = () => setModal({ type: "logs" });
  const handleOpenModels = () => setModal({ type: "models" });
  const handleOpenRoi = () => setModal({ type: "roi" });
  const handleOpenAdd = () => setModal({ type: "add" });
  const handleSelectAgent = (agent: MissionAgent) => setModal({ type: "agent", agent });
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
        <MissionHeader
          statusSummary={statusSummary}
          snapshotTime={snapshotTime}
          tokenUsage={tokenUsage}
          onOpenTokens={handleOpenRoi}
        />
        <SliceHub slices={slices} onSelectSlice={handleSelectSlice} onSelectAgent={handleSelectAgent} />
      </main>
      <AgentHangarPanel
        agents={agents}
        loading={loading.snapshot}
        onViewAll={handleOpenModels}
        onAdd={handleOpenAdd}
        onSelectAgent={handleSelectAgent}
      />
      <MissionModals modal={modal} onClose={handleCloseModal} events={events} agents={agents} slices={slices} />
    </div>
  );
};

export default VibesMissionControl;

