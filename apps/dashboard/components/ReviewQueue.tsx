import React from "react";
import { ReviewQueueItem } from "../types/review";

interface ReviewQueueProps {
  items: ReviewQueueItem[];
  loading: boolean;
  onSelect: (item: ReviewQueueItem) => void;
  onShowAgents: () => void;
  onRefresh: () => void;
  activeTaskId?: string | null;
  layout?: "sidebar" | "plain";
}

const STATUS_META: Record<
  ReviewQueueItem["status"],
  {
    label: string;
    tone: string;
  }
> = {
  pending: { label: "Pending", tone: "pending" },
  changes_requested: { label: "Changes requested", tone: "changes" },
  approved: { label: "Approved", tone: "approved" },
  restored: { label: "Restored", tone: "restored" },
};

const ReviewQueue: React.FC<ReviewQueueProps> = ({
  items,
  loading,
  onSelect,
  onShowAgents,
  onRefresh,
  activeTaskId,
  layout = "sidebar",
}) => {
  const Container: React.ElementType = layout === "sidebar" ? "aside" : "section";
  const containerClass =
    layout === "sidebar" ? "rail rail--right review-queue review-queue--rail" : "review-queue review-queue--plain";

  return (
    <Container className={containerClass} aria-label="Review queue">
      <div className="rail__header">
        <div className="rail__tabs" role="tablist" aria-label="Sidebar tabs">
          <button
            type="button"
            className="rail__tab"
            role="tab"
            aria-selected="false"
            onClick={onShowAgents}
          >
            Agents
          </button>
          <button type="button" className="rail__tab rail__tab--active" role="tab" aria-selected="true">
            🧾 Review Queue
            {items.length > 0 && <span className="rail__tab-badge">{items.length}</span>}
          </button>
        </div>
        <button type="button" onClick={onRefresh} className="rail__button rail__button--ghost">
          Refresh
        </button>
        <span className="rail__title">Review Queue</span>
      </div>
      <div className="rail__scroll review-queue__list">
        {loading && items.length === 0 && <p className="rail__empty">Loading review queue…</p>}
        {!loading && items.length === 0 && <p className="rail__empty">No flagged tasks waiting on review.</p>}
        {items.map((item) => {
          const status = STATUS_META[item.status] ?? STATUS_META.pending;
          const isActive = item.taskId === activeTaskId;
          return (
            <button
              key={item.taskId}
              type="button"
              className={`review-queue__item ${isActive ? "review-queue__item--active" : ""}`}
              onClick={() => onSelect(item)}
            >
              <div className="review-queue__item-header">
                <span className={`review-queue__pill review-queue__pill--${status.tone}`}>{status.label}</span>
                {item.updatedAt && <span className="review-queue__timestamp">{new Date(item.updatedAt).toLocaleString()}</span>}
              </div>
              <span className="review-queue__title">
                {item.taskNumber ? `${item.taskNumber} — ${item.title}` : item.title}
              </span>
              <p className="review-queue__summary">{item.summary ?? "No summary available for this task yet."}</p>
              <div className="review-queue__meta">
                {item.owner && <span>Owner: {item.owner}</span>}
                {item.sliceName && <span>Slice: {item.sliceName}</span>}
              </div>
              {item.notes && <p className="review-queue__notes">“{item.notes}”</p>}
            </button>
          );
        })}
      </div>
    </Container>
  );
};

export default ReviewQueue;

