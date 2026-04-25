import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
const STATUS_LABEL = {
    pending: "Pending",
    changes_requested: "Changes requested",
    approved: "Approved",
    restored: "Restored",
};
const ReviewPanel = ({ review, task, dispatch, onClose, onAfterAction }) => {
    const [notes, setNotes] = useState(review.notes ?? "");
    const statusLabel = STATUS_LABEL[review.status] ?? STATUS_LABEL.pending;
    const isDispatching = dispatch.status === "pending";
    const canSubmit = dispatch.available && !isDispatching;
    const previewUrl = review.previewUrl ?? review.restore?.preview_url;
    const [previewOpen, setPreviewOpen] = useState(Boolean(previewUrl));
    useEffect(() => {
        setNotes(review.notes ?? "");
    }, [review.taskId, review.notes]);
    useEffect(() => {
        setPreviewOpen(Boolean(previewUrl));
    }, [previewUrl]);
    const taskMetadata = useMemo(() => {
        if (!task)
            return [];
        const rows = [
            { label: "Status", value: task.status.replaceAll("_", " ") },
            { label: "Last updated", value: new Date(task.updatedAt).toLocaleString() },
        ];
        if (typeof task.confidence === "number") {
            rows.splice(1, 0, { label: "Confidence", value: `${Math.round(task.confidence * 100)}%` });
        }
        if (task.owner) {
            rows.push({ label: "Owner", value: task.owner });
        }
        if (task.location?.label) {
            rows.push({ label: "Location", value: task.location.label });
        }
        return rows;
    }, [task]);
    const handleAction = async (workflow, payload, includeNotes = true) => {
        try {
            await dispatch.trigger({
                workflow,
                inputs: includeNotes
                    ? {
                        ...payload,
                        notes,
                    }
                    : payload,
            });
            onAfterAction();
        }
        catch {
            // errors surfaced via dispatch.error
        }
    };
    return (_jsxs("div", { className: "review-panel", role: "dialog", "aria-modal": "true", "aria-label": "Review panel", children: [_jsx("div", { className: "review-panel__backdrop", onClick: onClose, "aria-hidden": "true" }), _jsxs("section", { className: "review-panel__surface", children: [_jsxs("header", { className: "review-panel__header", children: [_jsxs("div", { children: [_jsx("p", { className: "review-panel__eyebrow", children: "Human-in-the-loop Review" }), _jsx("h2", { className: "review-panel__title", children: review.taskNumber ? `${review.taskNumber} · ${review.title}` : review.title })] }), _jsxs("div", { className: "review-panel__actions", children: [_jsx("span", { className: `review-panel__status review-panel__status--${review.status}`, children: statusLabel }), _jsx("button", { type: "button", className: "review-panel__close", onClick: onClose, "aria-label": "Close review panel", children: "\u2715" })] })] }), _jsxs("div", { className: "review-panel__body", children: [_jsxs("article", { className: "review-panel__column", children: [_jsx("h3", { children: "Current snapshot" }), task ? (_jsxs(_Fragment, { children: [_jsx("p", { className: "review-panel__summary", children: task.summary ?? "No task summary captured yet." }), _jsx("dl", { className: "review-panel__meta", children: taskMetadata.map((entry) => (_jsxs("div", { children: [_jsx("dt", { children: entry.label }), _jsx("dd", { children: entry.value })] }, entry.label))) }), task.packet?.prompt && (_jsxs("section", { className: "review-panel__prompt", children: [_jsx("h4", { children: "Prompt" }), _jsx("p", { children: task.packet.prompt })] })), task.packet?.attachments && task.packet.attachments.length > 0 && (_jsxs("section", { className: "review-panel__attachments", children: [_jsx("h4", { children: "Attachments" }), _jsx("ul", { children: task.packet.attachments.map((attachment) => (_jsx("li", { children: _jsx("a", { href: attachment.href, target: "_blank", rel: "noreferrer", children: attachment.label }) }, attachment.href))) })] }))] })) : (_jsxs("p", { className: "review-panel__summary", children: ["No task snapshot found for ", review.taskId, "."] })), review.diffUrl && (_jsx("a", { className: "review-panel__link", href: review.diffUrl, target: "_blank", rel: "noreferrer", children: "View diff" })), review.comparisonUrl && (_jsx("a", { className: "review-panel__link", href: review.comparisonUrl, target: "_blank", rel: "noreferrer", children: "Compare preview" })), previewUrl && (_jsxs("section", { className: "review-panel__preview", children: [_jsxs("div", { className: "review-panel__preview-header", children: [_jsx("h4", { children: "Preview" }), _jsxs("div", { className: "review-panel__preview-actions", children: [_jsx("a", { href: previewUrl, target: "_blank", rel: "noreferrer", className: "review-panel__link", children: "Open in new tab" }), _jsx("button", { type: "button", className: "review-panel__preview-toggle", onClick: () => setPreviewOpen((prev) => !prev), children: previewOpen ? "Hide" : "Show" })] })] }), previewOpen ? (_jsx("div", { className: "review-panel__preview-frame", children: _jsx("iframe", { src: previewUrl, title: `Review preview for ${review.title}`, className: "review-panel__preview-iframe", loading: "lazy" }) })) : (_jsx("p", { className: "review-panel__hint", children: "Preview hidden \u2014 select \"Show\" to embed it here." }))] })), review.restore && (_jsxs("section", { className: "review-panel__restore", children: [_jsx("h4", { children: "Restore preview" }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "Branch" }), _jsx("dd", { children: review.restore.restore_branch })] }), _jsxs("div", { children: [_jsx("dt", { children: "Source ref" }), _jsx("dd", { children: review.restore.source_ref })] }), review.restore.preview_url && (_jsxs("div", { children: [_jsx("dt", { children: "Preview" }), _jsx("dd", { children: _jsx("a", { href: review.restore.preview_url, target: "_blank", rel: "noreferrer", children: "Open preview" }) })] }))] })] }))] }), _jsxs("article", { className: "review-panel__column review-panel__column--actions", children: [_jsx("h3", { children: "Decision" }), _jsx("label", { className: "review-panel__label", htmlFor: "review-panel-notes", children: "Notes" }), _jsx("textarea", { id: "review-panel-notes", className: "review-panel__textarea", value: notes, placeholder: "Add context for the deployer...", onChange: (event) => setNotes(event.target.value), rows: 6 }), !dispatch.available && (_jsx("p", { className: "review-panel__hint", children: "Workflow dispatch is not configured (missing VITE_GH_TOKEN). Configure secrets to enable Review Plane actions." })), dispatch.error && _jsx("p", { className: "review-panel__error", children: dispatch.error }), _jsxs("div", { className: "review-panel__cta", children: [_jsx("button", { type: "button", className: "review-panel__button review-panel__button--approve", disabled: !canSubmit, onClick: () => handleAction("approve_review.yml", { task_id: review.taskId }), children: "Approve" }), _jsx("button", { type: "button", className: "review-panel__button review-panel__button--changes", disabled: !canSubmit, onClick: () => handleAction("request_changes.yml", { task_id: review.taskId }), children: "Request changes" }), _jsx("button", { type: "button", className: "review-panel__button review-panel__button--restore", disabled: !canSubmit, onClick: () => handleAction("restore-preview.yml", { task_id: review.taskId }, false), children: "Restore preview" })] }), isDispatching && _jsx("p", { className: "review-panel__hint", children: "Dispatching workflow\u2026" })] })] })] })] }));
};
export default ReviewPanel;
