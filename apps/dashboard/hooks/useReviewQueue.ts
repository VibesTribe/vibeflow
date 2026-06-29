import { useCallback, useEffect, useState } from "react";

export type ReviewQueueItem = {
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
};

const govAPI =
  typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://webhooks.vibestribe.rocks"
    : "http://localhost:8080";

export function useReviewQueue() {
  const [reviews, setReviews] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${govAPI}/api/review-items`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      } else {
        console.warn("[useReviewQueue] failed to fetch", res.status);
        setReviews([]);
      }
    } catch (error) {
      console.warn("[useReviewQueue] error", error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshCount]);

  return { reviews, loading, refresh, triggerRefresh: () => setRefreshCount(prev => prev + 1) };
}
