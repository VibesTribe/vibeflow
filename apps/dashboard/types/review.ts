import { TaskSnapshot } from "@core/types";
import { RestoreRecord, ReviewEntry } from "../hooks/useReviewData";

export interface ReviewQueueItem {
  taskId: string;
  title: string;
  taskNumber?: number | string;
  sliceName?: string;
  owner?: string | null;
  summary?: string;
  updatedAt?: string;
  status: string;
  notes?: string;
  reviewer?: string;
  diffUrl?: string;
  comparisonUrl?: string;
  previewUrl?: string;
  entry: ReviewEntry;
  task?: TaskSnapshot;
  restore?: RestoreRecord;
  // Fields from /api/review-items (research reports, council items)
  id?: string;
  source_id?: string;
  type?: string;
  category?: string;
  priority?: string;
  payload?: Record<string, unknown>;
  review_url?: string;
}

