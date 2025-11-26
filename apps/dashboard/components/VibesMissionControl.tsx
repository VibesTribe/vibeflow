import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TaskSnapshot } from "@core/types";
import MissionHeader from "./MissionHeader";
import SliceHub from "./SliceHub";
import ReviewPanel from "./ReviewPanel";
import MissionModals, { MissionModalState } from "./modals/MissionModals";
import { useMissionData } from "../hooks/useMissionData";
import { MissionAgent, MissionSlice, SliceAssignment } from "../utils/mission";
import { useReviewData } from "../hooks/useReviewData";
import { ReviewQueueItem } from "../types/review";
import { useWorkflowDispatch } from "../utils/useWorkflowDispatch";

const VibesMissionControl: React.FC = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector(".mission-root--wide")) {
      return;
    }
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

  const { snapshot, events, slices, agents, statusSummary, tokenUsage } = useMissionData();
  const { reviews, restores, refresh: refreshReviews } = useReviewData();
  const workflowDispatch = useWorkflowDispatch();
  const [modal, setModal] = useState<MissionModalState>({ type: null });
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);

  const handleOpenDocs = () => setModal({ type: "docs" });
  const handleOpenLogs = () => setModal({ type: "logs" });
  const handleOpenModels = () => setModal({ type: "models" });
  const handleOpenRoi = () => setModal({ type: "roi" });
  const handleOpenAdmin = () => setModal({ type: "admin" });
  const handleSelectAgent = (agent: MissionAgent) => setModal({ type: "agent", agent });
  const handleOpenAssignmentDetail = useCallback((assignment: SliceAssignment, slice: MissionSlice) => {
    setModal({ type: "assignment", assignment, slice });
  }, []);
  const handleSelectSlice = (slice: MissionSlice) => setModal({ type: "slice", slice });
  const handleCloseModal = () => setModal({ type: null });

  const reviewItems = useMemo<ReviewQueueItem[]>(() => {
    if (!reviews || reviews.length === 0) {
      return [];
    }
    const sliceNameById = new Map(slices.map((slice) => [slice.id, slice.name]));
    return reviews.map((review) => {
      const task = snapshot.tasks.find((entry) => entry.id === review.task_id);
      const sliceName = task?.sliceId ? sliceNameById.get(task.sliceId) : undefined;
      const restoreEntry = restores[review.task_id];
      const previewUrl = review.preview_url ?? restoreEntry?.preview_url ?? review.comparison_url ?? review.diff_url;
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
        previewUrl,
        entry: review,
        task,
        restore: restoreEntry,
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
    <div className="mission-root--wide">
      <main className="mission-main">
        <MissionHeader
          statusSummary={statusSummary}
          tasks={(snapshot.tasks as TaskSnapshot[] | undefined) ?? []}
          slices={slices}
          events={events}
          tokenUsage={tokenUsage}
          onOpenTokens={handleOpenRoi}
          onOpenReviewTask={openReviewByTask}
        />
        <div className="mission-action-bar" role="navigation" aria-label="Mission controls">
          <button type="button" onClick={handleOpenLogs}>
            Logs
          </button>
          <button type="button" onClick={handleOpenModels}>
            Models
          </button>
          <button type="button" onClick={handleOpenDocs}>
            Docs
          </button>
          <button type="button" onClick={handleOpenAdmin}>
            Admin
          </button>
        </div>
        <SliceHub slices={slices} events={events} onSelectSlice={handleSelectSlice} onOpenAssignment={handleOpenAssignmentDetail} />
      </main>
      <MissionModals
        modal={modal}
        onClose={handleCloseModal}
        events={events}
        agents={agents}
        slices={slices}
        tasks={snapshot.tasks ?? []}
        onOpenReview={openReviewByTask}
        onSelectAgent={handleSelectAgent}
        onShowModels={handleOpenModels}
      />
      {selectedReview && (
        <ReviewPanel review={selectedReview} task={selectedReview.task} dispatch={workflowDispatch} onClose={() => setActiveReviewId(null)} onAfterAction={handleReviewActionComplete} />
      )}
    </div>
  );
};

export default VibesMissionControl;
