import { useCallback, useEffect, useState } from "react";

export interface RestoreRecord {
  task_id: string;
  restore_branch: string;
  source_ref: string;
  created_at: string;
  files?: string[];
  preview_url?: string;
}

const restoreFileUrls = import.meta.glob("../../../data/state/restores/*.json", { eager: true, import: "default", query: "?url" }) as Record<string, string>;

export function useRestoreData() {
  const [restores, setRestores] = useState<Record<string, RestoreRecord>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (Object.keys(restoreFileUrls).length === 0) {
        setRestores({});
      } else {
        const restoreEntries = await Promise.all(
          Object.values(restoreFileUrls).map(async (url) => {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Failed to load ${url}`);
            return res.json();
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
      console.warn("[useRestoreData] failed to load restore metadata", error);
      setRestores({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { restores, loading, refresh };
}
