import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TaskSnapshot } from "@core/types";
import MissionHeader from "./MissionHeader";
import SliceDockPanel from "./SliceDockPanel";
import AgentHangarPanel from "./AgentHangarPanel";
import SliceHub from "./SliceHub";
import ReviewPanel from "./ReviewPanel";
import MissionModals, { MissionModalState } from "./modals/MissionModals";
import { useMissionData } from "../hooks/useMissionData";
import { MissionAgent, MissionSlice } from "../utils/mission";
import { useReviewData } from "../hooks/useReviewData";
import { ReviewQueueItem } from "../types/review";
import { useWorkflowDispatch } from "../utils/useWorkflowDispatch";

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

type MobilePanelView = "slices" | "agents" | null;

const VibesMissionControl: React.FC = () => {
  const isMobile = usePrefersMobile();
  useEffect(() => {
    if (typeof document === "undefined") return;
    const htmlElement = document.documentElement;
    const fallbackBody = document.body;
    if (!(htmlElement instanceof HTMLElement) || !(fallbackBody instanceof HTMLElement)) {
      return;
    }

    const targetBody = (document.querySelector("body#dummybodyid") as HTMLElement | null) ?? fallbackBody;
    const originalHtmlOverflow = htmlElement.style.getPropertyValue("overflow");
    const originalHtmlPriority = htmlElement.style.getPropertyPriority("overflow");
    const originalBodyOverflow = targetBody.style.getPropertyValue("overflow");
    const originalBodyPriority = targetBody.style.getPropertyPriority("overflow");

    htmlElement.style.setProperty("overflow", "hidden", "important");
    targetBody.style.setProperty("overflow", "hidden", "important");

    return () => {
      if (originalHtmlOverflow) {
        htmlElement.style.setProperty("overflow", originalHtmlOverflow, originalHtmlPriority);
      } else {
        htmlElement.style.removeProperty("overflow");
      }
      if (originalBodyOverflow) {
        targetBody.style.setProperty("overflow", originalBodyOverflow, originalBodyPriority);
      } else {
        targetBody.style.removeProperty("overflow");
      }
    };
  }, []);

  const { snapshot, events, slices, agents, statusSummary, tokenUsage, loading } = useMissionData();
  const { reviews, restores, refresh: refreshReviews } = useReviewData();
  const workflowDispatch = useWorkflowDispatch();
  const [modal, setModal] = useState<MissionModalState>({ type: null });
  const [mobilePanel, setMobilePanel] = useState<MobilePanelView>(null);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

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
  const handleOpenMobilePanel = (panel: MobilePanelView) => setMobilePanel(panel);
  const handleCloseMobilePanel = () => setMobilePanel(null);

  const reviewItems = useMemo<ReviewQueueItem[]>(() => {
    if (!reviews || reviews.length === 0) {
      return [];
    }
    const sliceNameById = new Map(slices.map((slice) => [slice.id, slice.name]));
    return reviews.map((review) => {
      const task = snapshot.tasks.find((entry) => entry.id === review.task_id);
      const sliceName = task?.sliceId ? sliceNameById.get(task.sliceId) : undefined;
      return {
        taskId: review.task_id,
        title: task?.title ?? `Task ${review.task_id}`,
        taskNumber: task?.taskNumber,
        sliceName,
        owner: task?.owner ?? null,
        summary: task?.summary,
        updatedAt: review.updated_at,
        status: review.review,
        notes: review.notes,
        reviewer: review.reviewer,
        diffUrl: review.diff_url,
        comparisonUrl: review.comparison_url,
        entry: review,
        task,
        restore: restores[review.task_id],
      };
    });
  }, [reviews, snapshot.tasks, slices, restores]);

  const openReviewByTask = useCallback(
    (taskId: string) => {
      const target = reviewItems.find((item) => item.taskId === taskId);
      if (target) {
        setActiveReviewId(target.taskId);
      } else {
        console.warn("[mission-control] no review entry found for", taskId);
      }
    },
    [reviewItems],
  );

  const selectedReview = useMemo(
    () => reviewItems.find((item) => item.taskId === activeReviewId),
    [reviewItems, activeReviewId],
  );

  const handleReviewActionComplete = useCallback(() => {
    refreshReviews();
    workflowDispatch.reset();
  }, [refreshReviews, workflowDispatch]);

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
          tasks={(snapshot.tasks as TaskSnapshot[] | undefined) ?? []}
          snapshotTime={snapshotTime}
          tokenUsage={tokenUsage}
          onOpenTokens={handleOpenRoi}
          onOpenReviewTask={openReviewByTask}
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
                Tasks
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
                Agents
              </button>
            </div>
          </div>
        )}
        <SliceHub slices={slices} onSelectSlice={handleSelectSlice} onSelectAgent={handleSelectAgent} />
      </main>
      <AgentHangarPanel agents={agents} loading={loading.snapshot} onViewAll={handleOpenModels} onAdd={handleOpenAdd} onSelectAgent={handleSelectAgent} />
      <MissionModals modal={modal} onClose={handleCloseModal} events={events} agents={agents} slices={slices} onOpenReview={openReviewByTask} />
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
      {selectedReview && (
        <ReviewPanel review={selectedReview} task={selectedReview.task} dispatch={workflowDispatch} onClose={() => setActiveReviewId(null)} onAfterAction={handleReviewActionComplete} />
      )}
    </div>
  );
};

export default VibesMissionControl;


