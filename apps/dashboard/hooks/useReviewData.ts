import { useCallback, useEffect, useState } from "react";

type GlobUrlMap = Record<string, string>;

const reviewFileUrls = import.meta.glob("../../../data/state/reviews/*.json", { eager: true, import: "default", query: "?url" }) as GlobUrlMap;
const restoreFileUrls = import.meta.glob("../../../data/state/restores/*.json", { eager: true, import: "default", query: "?url" }) as GlobUrlMap;

export type ReviewStatus = "pending" | "changes_requested" | "approved" | "restored";

export interface ReviewRecord {
  task_id: string;
  review: ReviewStatus;
  notes?: string;
  reviewer?: string;
  updated_at?: string;
  branch?: string;
  diff_url?: string;
  comparison_url?: string;
  preview_url?: string;
  attachments?: Array<{ label: string; url: string }>;
}

export interface RestoreRecord {
  task_id: string;
  restore_branch: string;
  source_ref: string;
  created_at: string;
  files?: string[];
  preview_url?: string;
}

export interface ReviewEntry extends ReviewRecord {
  file: string;
}

export interface ReviewDataState {
  reviews: ReviewEntry[];
  restores: Record<string, RestoreRecord>;
  loading: boolean;
  refresh: () => void;
}

function normalizeStatus(status?: string): ReviewStatus {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
      return "approved";
    case "changes_requested":
    case "changes-requested":
      return "changes_requested";
    case "restored":
      return "restored";
    default:
      return "pending";
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${url} (${response.status})`);
  }
  return (await response.json()) as T;
}

export function useReviewData(): ReviewDataState {
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [restores, setRestores] = useState<Record<string, RestoreRecord>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (Object.keys(reviewFileUrls).length === 0) {
        setReviews([]);
      } else {
        const entries = await Promise.all(
          Object.entries(reviewFileUrls).map(async ([path, url]) => {
            const record = await fetchJson<ReviewRecord>(url);
            return {
              ...record,
              file: path,
              review: normalizeStatus(record.review),
            };
          }),
        );
        setReviews(entries);
      }
    } catch (error) {
      console.warn("[review-data] failed to load review queue", error);
      setReviews([]);
    }

    try {
      if (Object.keys(restoreFileUrls).length === 0) {
        setRestores({});
      } else {
        const restoreEntries = await Promise.all(
          Object.values(restoreFileUrls).map(async (url) => fetchJson<RestoreRecord>(url)),
        );
        const mapped: Record<string, RestoreRecord> = {};
        restoreEntries.forEach((entry) => {
          if (entry?.task_id) {
            mapped[entry.task_id] = entry;
          }
        });
        setRestores(mapped);
      }
    } catch (error) {
      console.warn("[review-data] failed to load restore metadata", error);
      setRestores({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reviews, restores, loading, refresh };
}
