import React, { useEffect, useMemo, useState } from "react";
import { TaskStatus } from "@core/types";
import MissionHeader, { MissionTaskStats } from "./MissionHeader";
import SliceDockPanel from "./SliceDockPanel";
import AgentHangarPanel from "./AgentHangarPanel";
import SliceHub from "./SliceHub";
import MissionModals, { MissionModalState } from "./modals/MissionModals";
import { useMissionData } from "../hooks/useMissionData";
import { MissionAgent, MissionSlice } from "../utils/mission";

function usePrefersMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window === "undefined" ? false : window.innerWidth <= breakpoint));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

const VibesMissionControl: React.FC = () => {
  const isMobile = usePrefersMobile();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement as HTMLElement;
    const targetBody = (document.querySelector("body#dummybodyid") as HTMLElement | null) || document.body;

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
  const [mobilePanel, setMobilePanel] = useState<"slices" | "agents" | null>(null);

  const snapshotTime = useMemo(() => {
    if (!snapshot.updatedAt) {
      return "-";
    }
    return new Date(snapshot.updatedAt).toLocaleTimeString();
  }, [snapshot.updatedAt]);

  const taskStats = useMemo<MissionTaskStats>(() => {
    const tasks = snapshot.tasks ?? [];
    const flaggedStatuses = new Set<TaskStatus>(["supervisor_review", "supervisor_approval", "received"]);
    let flagged = 0;
    tasks.forEach((task) => {
      if (flaggedStatuses.has(task.status)) {
        flagged += 1;
      }
    });
    return {
      total: statusSummary.total,
      completed: statusSummary.completed,
      active: statusSummary.active,
      flagged,
      locked: statusSummary.blocked,
    };
  }, [snapshot.tasks, statusSummary]);

  const handleOpenDocs = () => setModal({ type: "docs" });
  const handleOpenLogs = () => setModal({ type: "logs" });
  const handleOpenModels = () => setModal({ type: "models" });
  const handleOpenRoi = () => setModal({ type: "roi" });
  const handleOpenAdd = () => setModal({ type: "add" });
  const handleSelectAgent = (agent: MissionAgent) => setModal({ type: "agent", agent });
  const handleSelectSlice = (slice: MissionSlice) => setModal({ type: "slice", slice });
  const handleCloseModal = () => setModal({ type: null });
  const handleOpenMobilePanel = (panel: "slices" | "agents") => setMobilePanel(panel);
  const handleCloseMobilePanel = () => setMobilePanel(null);

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
          taskStats={taskStats}
          snapshotTime={snapshotTime}
          tokenUsage={tokenUsage}
          onOpenTokens={handleOpenRoi}
        />
        {isMobile && (
          <div className="mission-mobile-nav">
            <div className="mission-mobile-nav__group">
              <button type="button" className="mission-mobile-nav__button" onClick={handleOpenLogs}>
                Logs
              </button>
              <button type="button" className="mission-mobile-nav__button" onClick={handleOpenDocs}>
                Docs
              </button>
              <button type="button" className="mission-mobile-nav__button" onClick={() => handleOpenMobilePanel("slices")}>
                Slice Dock
              </button>
            </div>
            <div className="mission-mobile-nav__group">
              <button type="button" className="mission-mobile-nav__button" onClick={handleOpenModels}>
                Models
              </button>
              <button type="button" className="mission-mobile-nav__button" onClick={handleOpenAdd}>
                Add
              </button>
              <button type="button" className="mission-mobile-nav__button" onClick={() => handleOpenMobilePanel("agents")}>
                Agent Hangar
              </button>
            </div>
          </div>
        )}
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
      {isMobile && mobilePanel && (
        <div className="mobile-panel-overlay">
          <button type="button" className="mobile-panel-overlay__close" aria-label="Close panel" onClick={handleCloseMobilePanel}>
            {"\u00D7"}
          </button>
          <div className="mobile-panel-overlay__body">
            {mobilePanel === "slices" ? (
              <SliceDockPanel
                slices={slices}
                loading={loading.snapshot}
                onViewDocs={handleOpenDocs}
                onViewLogs={handleOpenLogs}
                onSelectSlice={handleSelectSlice}
              />
            ) : (
              <AgentHangarPanel agents={agents} loading={loading.snapshot} onViewAll={handleOpenModels} onAdd={handleOpenAdd} onSelectAgent={handleSelectAgent} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VibesMissionControl;


