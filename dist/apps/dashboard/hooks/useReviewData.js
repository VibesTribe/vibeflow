import { useCallback, useEffect, useState } from "react";
const reviewFileUrls = import.meta.glob("../../../data/state/reviews/*.json", { eager: true, import: "default", query: "?url" });
const restoreFileUrls = import.meta.glob("../../../data/state/restores/*.json", { eager: true, import: "default", query: "?url" });
function normalizeStatus(status) {
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
async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Failed to load ${url} (${response.status})`);
    }
    return (await response.json());
}
export function useReviewData() {
    const [reviews, setReviews] = useState([]);
    const [restores, setRestores] = useState({});
    const [loading, setLoading] = useState(true);
    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            if (Object.keys(reviewFileUrls).length === 0) {
                setReviews([]);
            }
            else {
                const entries = await Promise.all(Object.entries(reviewFileUrls).map(async ([path, url]) => {
                    const record = await fetchJson(url);
                    return {
                        ...record,
                        file: path,
                        review: normalizeStatus(record.review),
                    };
                }));
                setReviews(entries);
            }
        }
        catch (error) {
            console.warn("[review-data] failed to load review queue", error);
            setReviews([]);
        }
        try {
            if (Object.keys(restoreFileUrls).length === 0) {
                setRestores({});
            }
            else {
                const restoreEntries = await Promise.all(Object.values(restoreFileUrls).map(async (url) => fetchJson(url)));
                const mapped = {};
                restoreEntries.forEach((entry) => {
                    if (entry?.task_id) {
                        mapped[entry.task_id] = entry;
                    }
                });
                setRestores(mapped);
            }
        }
        catch (error) {
            console.warn("[review-data] failed to load restore metadata", error);
            setRestores({});
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        refresh();
    }, [refresh]);
    return { reviews, restores, loading, refresh };
}
