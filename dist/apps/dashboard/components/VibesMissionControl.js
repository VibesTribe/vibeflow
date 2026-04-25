import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState, useCallback } from "react";
import MissionHeader from "./MissionHeader";
import SliceHub from "./SliceHub";
import ReviewPanel from "./ReviewPanel";
import MissionModals from "./modals/MissionModals";
import { useMissionData } from "../hooks/useMissionData";
import { useReviewData } from "../hooks/useReviewData";
import { useWorkflowDispatch } from "../utils/useWorkflowDispatch";
const VibesMissionControl = () => {
    useEffect(() => {
        if (typeof document === "undefined")
            return;
        if (document.querySelector(".mission-root--wide")) {
            return;
        }
        const htmlElement = document.documentElement;
        const fallbackBody = document.body;
        if (!(htmlElement instanceof HTMLElement) || !(fallbackBody instanceof HTMLElement)) {
            return;
        }
        const targetBody = document.querySelector("body#dummybodyid") ?? fallbackBody;
        const originalHtmlOverflow = htmlElement.style.getPropertyValue("overflow");
        const originalHtmlPriority = htmlElement.style.getPropertyPriority("overflow");
        const originalBodyOverflow = targetBody.style.getPropertyValue("overflow");
        const originalBodyPriority = targetBody.style.getPropertyPriority("overflow");
        htmlElement.style.setProperty("overflow", "hidden", "important");
        targetBody.style.setProperty("overflow", "hidden", "important");
        return () => {
            if (originalHtmlOverflow) {
                htmlElement.style.setProperty("overflow", originalHtmlOverflow, originalHtmlPriority);
            }
            else {
                htmlElement.style.removeProperty("overflow");
            }
            if (originalBodyOverflow) {
                targetBody.style.setProperty("overflow", originalBodyOverflow, originalBodyPriority);
            }
            else {
                targetBody.style.removeProperty("overflow");
            }
        };
    }, []);
    const { snapshot, events, slices, agents, statusSummary, tokenUsage, roi, loading } = useMissionData();
    const { reviews, restores, refresh: refreshReviews } = useReviewData();
    const workflowDispatch = useWorkflowDispatch();
    const [modal, setModal] = useState({ type: null });
    const [activeReviewId, setActiveReviewId] = useState(null);
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
    const handleSelectAgent = (agent) => setModal({ type: "agent", agent });
    const handleOpenAssignmentDetail = useCallback((assignment, slice) => {
        setModal({ type: "assignment", assignment, slice });
    }, []);
    const handleSelectSlice = (slice) => setModal({ type: "slice", slice });
    const handleCloseModal = () => setModal({ type: null });
    const reviewItems = useMemo(() => {
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
    const openReviewByTask = useCallback((taskId) => {
        const target = reviewItems.find((item) => item.taskId === taskId);
        if (target) {
            setActiveReviewId(target.taskId);
        }
        else {
            console.warn("[mission-control] no review entry found for", taskId);
        }
    }, [reviewItems]);
    const selectedReview = useMemo(() => reviewItems.find((item) => item.taskId === activeReviewId), [reviewItems, activeReviewId]);
    const handleReviewActionComplete = useCallback(() => {
        refreshReviews();
        workflowDispatch.reset();
    }, [refreshReviews, workflowDispatch]);
    return (_jsxs("div", { className: "mission-root--wide", children: [_jsxs("main", { className: "mission-main", children: [_jsx(MissionHeader, { statusSummary: statusSummary, tasks: snapshot.tasks ?? [], slices: slices, events: events, snapshotTime: snapshotTime, tokenUsage: tokenUsage, roi: roi, onOpenTokens: handleOpenRoi, onOpenReviewTask: openReviewByTask }), _jsxs("div", { className: "mission-action-bar", role: "navigation", "aria-label": "Mission controls", children: [_jsx("button", { type: "button", onClick: handleOpenLogs, children: "Logs" }), _jsx("button", { type: "button", onClick: handleOpenModels, children: "Models" }), _jsx("button", { type: "button", onClick: handleOpenDocs, children: "Docs" }), _jsx("button", { type: "button", onClick: handleOpenAdmin, children: "Admin" })] }), _jsx(SliceHub, { slices: slices, events: events, onSelectSlice: handleSelectSlice, onOpenAssignment: handleOpenAssignmentDetail })] }), _jsx(MissionModals, { modal: modal, onClose: handleCloseModal, events: events, agents: agents, slices: slices, roi: roi, onOpenReview: openReviewByTask, onSelectAgent: handleSelectAgent, onShowModels: handleOpenModels }), selectedReview && (_jsx(ReviewPanel, { review: selectedReview, task: selectedReview.task, dispatch: workflowDispatch, onClose: () => setActiveReviewId(null), onAfterAction: handleReviewActionComplete }))] }));
};
export default VibesMissionControl;
