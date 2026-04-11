import { TaskSnapshot } from "@core/types";
import { RestoreRecord, ReviewEntry } from "../hooks/useReviewData";

export interface ReviewQueueItem {
  taskId: string;
  title: string;
  taskNumber?: string;
  sliceName?: string;
  owner?: string | null;
  summary?: string;
  updatedAt?: string;
  status: ReviewEntry["review"];
  notes?: string;
  reviewer?: string;
  diffUrl?: string;
  comparisonUrl?: string;
  previewUrl?: string;
  entry: ReviewEntry;
  task?: TaskSnapshot;
  restore?: RestoreRecord;
}

