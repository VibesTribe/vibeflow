import React, { useEffect, useMemo, useState, useCallback } from "react";
import { TaskSnapshot } from "@core/types";
import MissionHeader from "./MissionHeader";
import SliceHub from "./SliceHub";
import ReviewPanel from "./ReviewPanel";
import ResearchReportPanel from "./ResearchReportPanel";
import MissionModals, { MissionModalState } from "./modals/MissionModals";
import { useMissionData } from "../hooks/useMissionData";
import { MissionAgent, MissionSlice, SliceAssignment } from "../utils/mission";
import { useReviewData } from "../hooks/useReviewData";
import { ReviewQueueItem } from "../types/review";
import { useWorkflowDispatch } from "../utils/useWorkflowDispatch";
import KanbanBoard from "./KanbanBoard";
import ProjectIntake from "./ProjectIntake";

interface VibesMissionControlProps {
  initialProjectSlug?: string;
  onBackToOverview?: () => void;
}

const VibesMissionControl: React.FC<VibesMissionControlProps> = ({ initialProjectSlug, onBackToOverview }) => {
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

  const [selectedProjectSlug, setSelectedProjectSlug] = useState<string>(() => {
    // Use prop from router if provided, then localStorage, then default
    if (initialProjectSlug) return initialProjectSlug;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("vp_selected_project");
      return stored || "vibepilot";
    }
    return "vibepilot";
  });

  const { snapshot, events, slices, agents, statusSummary, tokenUsage, agentTokens, roi, models, projectCosts, agent_sessions, projectTodos, loading, updateTaskStatus, bulkUpdateTaskStatus } = useMissionData(selectedProjectSlug);
  const { reviews, restores, refresh: refreshReviews } = useReviewData();
  const workflowDispatch = useWorkflowDispatch();
  const [modal, setModal] = useState<MissionModalState>({ type: null });
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [researchReview, setResearchReview] = useState<{ reportId: string; reviewItemId: string } | null>(null);

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
      const tid = review.task_id || review.id;
      const task = snapshot.tasks.find((entry) => entry.id === tid);
      const sliceName = task?.sliceId ? sliceNameById.get(task.sliceId) : undefined;
      const restoreEntry = restores[tid];
      const previewUrl = review.preview_url ?? restoreEntry?.preview_url ?? review.comparison_url ?? review.diff_url;
      return {
        ...review,
        taskId: tid,
        taskNumber: task?.taskNumber,
        sliceName,
        owner: task?.owner ?? null,
        updatedAt: review.updated_at || review.created_at,
        entry: review,
        task,
        restore: restoreEntry,
        previewUrl,
      } as ReviewQueueItem;
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
        {onBackToOverview && (
          <button className="mission-back-to-hex" onClick={onBackToOverview} title="Back to project overview">
            ◆ Hex
          </button>
        )}
        <MissionHeader
          statusSummary={statusSummary}
          tasks={(snapshot.tasks as TaskSnapshot[] | undefined) ?? []}
          slices={slices}
          events={events}
          snapshotTime={snapshotTime}
          tokenUsage={tokenUsage}
          agentTokens={agentTokens}
          roi={roi ? {
            ...roi,
            totals: {
              ...roi.totals,
              net_savings_usd: roi.totals.total_savings_usd - (projectCosts || []).filter(c => !c.archived_at).reduce((s, c) => s + c.amount_usd, 0)
            }
          } : null}
          onOpenTokens={handleOpenRoi}
          onOpenReviewTask={openReviewByTask}
          onOpenResearchReview={(sourceId, reviewItemId) => setResearchReview({ reportId: sourceId, reviewItemId })}
          updateTaskStatus={updateTaskStatus}
          bulkUpdateTaskStatus={bulkUpdateTaskStatus}
          selectedProjectSlug={selectedProjectSlug}
          onProjectChange={setSelectedProjectSlug}
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
        {selectedProjectSlug !== "vibepilot" && (
          <ProjectIntake projectSlug={selectedProjectSlug} onIntakeComplete={() => {}} />
        )}
        <KanbanBoard todos={projectTodos || []} projectSlug={selectedProjectSlug} />
        <SliceHub slices={slices} events={events} onSelectSlice={handleSelectSlice} onOpenAssignment={handleOpenAssignmentDetail} />
      </main>
      <MissionModals
        modal={modal}
        onClose={handleCloseModal}
        events={events}
        agents={agents}
        slices={slices}
          roi={roi}
          models={models}
          projectCosts={projectCosts}
          agent_sessions={agent_sessions}
        onOpenReview={openReviewByTask}
        onSelectAgent={handleSelectAgent}
        onShowModels={handleOpenModels}
      />
      {selectedReview && (
        <ReviewPanel review={selectedReview} task={selectedReview.task} dispatch={workflowDispatch} onClose={() => setActiveReviewId(null)} onAfterAction={handleReviewActionComplete} />
      )}
      {researchReview && (
        <ResearchReportPanel
          reportId={researchReview.reportId}
          reviewItemId={researchReview.reviewItemId}
          onClose={() => setResearchReview(null)}
          onStatusChange={handleReviewActionComplete}
        />
      )}
    </div>
  );
};

export default VibesMissionControl;
