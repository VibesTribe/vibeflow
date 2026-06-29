import { useCallback, useEffect, useState } from "react";

export interface ReviewRecord {
  id: string;
  type: string;
  category: string;
  source_id: string;
  title: string;
  summary: string;
  status: string;
  priority: string;
  payload: Record<string, unknown>;
  review_url?: string;
  created_at?: string;
  notes?: string;
  reviewer?: string;
}

export interface RestoreRecord {
  task_id: string;
  restore_branch: string;
  source_ref: string;
  created_at: string;
  files?: string[];
  preview_url?: string;
}

export interface ReviewDataState {
  reviews: ReviewRecord[];
  restores: Record<string, RestoreRecord>;
  loading: boolean;
  refresh: () => void;
}

const restoreFileUrls = import.meta.glob("../../../data/state/restores/*.json", { eager: true, import: "default", query: "?url" }) as Record<string, string>;

const govAPI =
  typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://webhooks.vibestribe.rocks"
    : "http://localhost:8080";

export function useReviewData(): ReviewDataState {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [restores, setRestores] = useState<Record<string, RestoreRecord>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Reviews from Governor API
      const res = await fetch(`${govAPI}/api/review-items`);
      if (res.ok) {
        setReviews(await res.json());
      } else {
        console.warn("[useReviewData] failed to fetch reviews", res.status);
        setReviews([]);
      }

      // 2. Fetch Restores from static files
      if (Object.keys(restoreFileUrls).length > 0) {
        const restoreEntries = await Promise.all(
          Object.values(restoreFileUrls).map(async (url) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(`Failed to load ${url}`);
            return r.json();
          }),
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
      console.warn("[useReviewData] failed to load review data", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { reviews, restores, loading, refresh };
}
