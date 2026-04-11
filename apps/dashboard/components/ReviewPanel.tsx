import React, { useEffect, useMemo, useState } from "react";
import { TaskSnapshot } from "@core/types";
import { ReviewQueueItem } from "../types/review";
import { WorkflowDispatchResult } from "../utils/useWorkflowDispatch";

interface ReviewPanelProps {
  review: ReviewQueueItem;
  task?: TaskSnapshot;
  dispatch: WorkflowDispatchResult;
  onClose: () => void;
  onAfterAction: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  changes_requested: "Changes requested",
  approved: "Approved",
  restored: "Restored",
};

const ReviewPanel: React.FC<ReviewPanelProps> = ({ review, task, dispatch, onClose, onAfterAction }) => {
  const [notes, setNotes] = useState(review.notes ?? "");

  const statusLabel = STATUS_LABEL[review.status] ?? STATUS_LABEL.pending;
  const isDispatching = dispatch.status === "pending";
  const canSubmit = dispatch.available && !isDispatching;
  const previewUrl = review.previewUrl ?? review.restore?.preview_url;
  const [previewOpen, setPreviewOpen] = useState<boolean>(Boolean(previewUrl));

  useEffect(() => {
    setNotes(review.notes ?? "");
  }, [review.taskId, review.notes]);

  useEffect(() => {
    setPreviewOpen(Boolean(previewUrl));
  }, [previewUrl]);

  const taskMetadata = useMemo(() => {
    if (!task) return [];
    const rows: Array<{ label: string; value: string }> = [
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

  const handleAction = async (workflow: string, payload: Record<string, string | undefined>, includeNotes = true) => {
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
    } catch {
      // errors surfaced via dispatch.error
    }
  };

  return (
    <div className="review-panel" role="dialog" aria-modal="true" aria-label="Review panel">
      <div className="review-panel__backdrop" onClick={onClose} aria-hidden="true" />
      <section className="review-panel__surface">
        <header className="review-panel__header">
          <div>
            <p className="review-panel__eyebrow">Human-in-the-loop Review</p>
            <h2 className="review-panel__title">
              {review.taskNumber ? `${review.taskNumber} · ${review.title}` : review.title}
            </h2>
          </div>
          <div className="review-panel__actions">
            <span className={`review-panel__status review-panel__status--${review.status}`}>{statusLabel}</span>
            <button type="button" className="review-panel__close" onClick={onClose} aria-label="Close review panel">
              ✕
            </button>
          </div>
        </header>
        <div className="review-panel__body">
          <article className="review-panel__column">
            <h3>Current snapshot</h3>
            {task ? (
              <>
                <p className="review-panel__summary">{task.summary ?? "No task summary captured yet."}</p>
                <dl className="review-panel__meta">
                  {taskMetadata.map((entry) => (
                    <div key={entry.label}>
                      <dt>{entry.label}</dt>
                      <dd>{entry.value}</dd>
                    </div>
                  ))}
                </dl>
                {task.packet?.prompt && (
                  <section className="review-panel__prompt">
                    <h4>Prompt</h4>
                    <p>{task.packet.prompt}</p>
                  </section>
                )}
                {task.packet?.attachments && task.packet.attachments.length > 0 && (
                  <section className="review-panel__attachments">
                    <h4>Attachments</h4>
                    <ul>
                      {task.packet.attachments.map((attachment) => (
                        <li key={attachment.href}>
                          <a href={attachment.href} target="_blank" rel="noreferrer">
                            {attachment.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              <p className="review-panel__summary">No task snapshot found for {review.taskId}.</p>
            )}
            {review.diffUrl && (
              <a className="review-panel__link" href={review.diffUrl} target="_blank" rel="noreferrer">
                View diff
              </a>
            )}
            {review.comparisonUrl && (
              <a className="review-panel__link" href={review.comparisonUrl} target="_blank" rel="noreferrer">
                Compare preview
              </a>
            )}
            {previewUrl && (
              <section className="review-panel__preview">
                <div className="review-panel__preview-header">
                  <h4>Preview</h4>
                  <div className="review-panel__preview-actions">
                    <a href={previewUrl} target="_blank" rel="noreferrer" className="review-panel__link">
                      Open in new tab
                    </a>
                    <button
                      type="button"
                      className="review-panel__preview-toggle"
                      onClick={() => setPreviewOpen((prev) => !prev)}
                    >
                      {previewOpen ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
                {previewOpen ? (
                  <div className="review-panel__preview-frame">
                    <iframe
                      src={previewUrl}
                      title={`Review preview for ${review.title}`}
                      className="review-panel__preview-iframe"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <p className="review-panel__hint">Preview hidden — select "Show" to embed it here.</p>
                )}
              </section>
            )}
            {review.restore && (
              <section className="review-panel__restore">
                <h4>Restore preview</h4>
                <dl>
                  <div>
                    <dt>Branch</dt>
                    <dd>{review.restore.restore_branch}</dd>
                  </div>
                  <div>
                    <dt>Source ref</dt>
                    <dd>{review.restore.source_ref}</dd>
                  </div>
                  {review.restore.preview_url && (
                    <div>
                      <dt>Preview</dt>
                      <dd>
                        <a href={review.restore.preview_url} target="_blank" rel="noreferrer">
                          Open preview
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}
          </article>
          <article className="review-panel__column review-panel__column--actions">
            <h3>Decision</h3>
            <label className="review-panel__label" htmlFor="review-panel-notes">
              Notes
            </label>
            <textarea
              id="review-panel-notes"
              className="review-panel__textarea"
              value={notes}
              placeholder="Add context for the deployer..."
              onChange={(event) => setNotes(event.target.value)}
              rows={6}
            />
            {!dispatch.available && (
              <p className="review-panel__hint">
                Workflow dispatch is not configured (missing VITE_GH_TOKEN). Configure secrets to enable Review Plane actions.
              </p>
            )}
            {dispatch.error && <p className="review-panel__error">{dispatch.error}</p>}
            <div className="review-panel__cta">
              <button
                type="button"
                className="review-panel__button review-panel__button--approve"
                disabled={!canSubmit}
                onClick={() => handleAction("approve_review.yml", { task_id: review.taskId })}
              >
                Approve
              </button>
              <button
                type="button"
                className="review-panel__button review-panel__button--changes"
                disabled={!canSubmit}
                onClick={() => handleAction("request_changes.yml", { task_id: review.taskId })}
              >
                Request changes
              </button>
              <button
                type="button"
                className="review-panel__button review-panel__button--restore"
                disabled={!canSubmit}
                onClick={() => handleAction("restore-preview.yml", { task_id: review.taskId }, false)}
              >
                Restore preview
              </button>
            </div>
            {isDispatching && <p className="review-panel__hint">Dispatching workflow…</p>}
          </article>
        </div>
      </section>
    </div>
  );
};

export default ReviewPanel;
