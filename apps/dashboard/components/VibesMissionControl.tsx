import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TaskStatus, TaskSnapshot } from "@core/types";
import MissionHeader, { MissionTaskStats } from "./MissionHeader";
import SliceDockPanel from "./SliceDockPanel";
import AgentHangarPanel from "./AgentHangarPanel";
import SliceHub from "./SliceHub";
import ReviewQueue from "./ReviewQueue";
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

type MobilePanelView = "slices" | "agents" | "review" | null;

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
  const { reviews, restores, loading: reviewLoading, refresh: refreshReviews } = useReviewData();
  const workflowDispatch = useWorkflowDispatch();
  const [modal, setModal] = useState<MissionModalState>({ type: null });
  const [mobilePanel, setMobilePanel] = useState<MobilePanelView>(null);
  const [rightPanelView, setRightPanelView] = useState<"agents" | "review">("agents");
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

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

  const pendingReviewItems = useMemo(
    () => reviewItems.filter((item) => item.status === "pending" || item.status === "changes_requested"),
    [reviewItems],
  );
  const pendingCount = pendingReviewItems.length;

  const selectedReview = useMemo(
    () => reviewItems.find((item) => item.taskId === activeReviewId),
    [reviewItems, activeReviewId],
  );

  const handleShowReviewQueue = () => {
    setRightPanelView("review");
    if (isMobile) {
      setMobilePanel("review");
    }
  };

  const handleShowAgentHangar = () => {
    setRightPanelView("agents");
  };

  const handleSelectReview = (item: ReviewQueueItem) => {
    setActiveReviewId(item.taskId);
    setRightPanelView("review");
    if (isMobile) {
      setMobilePanel(null);
    }
  };

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
          taskStats={taskStats}
          tasks={(snapshot.tasks as TaskSnapshot[] | undefined) ?? []}
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
              <button type="button" className="mission-mobile-nav__button mission-mobile-nav__button--review" onClick={() => handleOpenMobilePanel("review")}>
                Review
                {pendingCount > 0 && <span className="mission-mobile-nav__badge">{pendingCount}</span>}
              </button>
            </div>
          </div>
        )}
        <SliceHub slices={slices} onSelectSlice={handleSelectSlice} onSelectAgent={handleSelectAgent} />
      </main>
      {rightPanelView === "review" ? (
        <ReviewQueue
          items={pendingReviewItems}
          loading={reviewLoading}
          onSelect={handleSelectReview}
          onShowAgents={handleShowAgentHangar}
          onRefresh={refreshReviews}
          activeTaskId={activeReviewId}
        />
      ) : (
        <AgentHangarPanel
          agents={agents}
          loading={loading.snapshot}
          onViewAll={handleOpenModels}
          onAdd={handleOpenAdd}
          onSelectAgent={handleSelectAgent}
          onShowReviewQueue={handleShowReviewQueue}
          reviewPendingCount={pendingCount}
        />
      )}
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
            ) : mobilePanel === "agents" ? (
              <AgentHangarPanel
                agents={agents}
                loading={loading.snapshot}
                onViewAll={handleOpenModels}
                onAdd={handleOpenAdd}
                onSelectAgent={handleSelectAgent}
                onShowReviewQueue={handleShowReviewQueue}
                reviewPendingCount={pendingCount}
              />
            ) : (
              <ReviewQueue
                items={pendingReviewItems}
                loading={reviewLoading}
                onSelect={handleSelectReview}
                onShowAgents={() => {
                  handleShowAgentHangar();
                  setMobilePanel("agents");
                }}
                onRefresh={refreshReviews}
                activeTaskId={activeReviewId}
                layout="plain"
              />
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


