import React, { useEffect, useState } from 'react';
import type { ModelStatusRecord } from '../../types/ModelStatus';

interface Props {
  fallbackData?: ModelStatusRecord[];
  refreshInterval?: number;
}

export const ModelStatusPanel: React.FC<Props> = ({ fallbackData = [], refreshInterval = 30000 }) => {
  const [models, setModels] = useState<ModelStatusRecord[]>(fallbackData);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const basePath = '/data/status/models/';
      const listResponse = await fetch(basePath);
      if (!listResponse.ok) throw new Error('Could not list model files');
      const text = await listResponse.text();
      const matches = [...text.matchAll(/href="([^"]+\.json)"/g)];
      const files = matches.map((m) => m[1]);

      const results: ModelStatusRecord[] = [];
      for (const file of files) {
        const res = await fetch(basePath + file);
        if (res.ok) results.push(await res.json());
      }
      if (results.length > 0) {
        results.sort((a, b) => {
          const order = { error: 0, warn: 1, info: 2 } as any;
          return order[a.severity] - order[b.severity];
        });
        setModels(results);
      }
    } catch (err) {
      console.warn('Using fallback data due to fetch failure', err);
      if (fallbackData.length) setModels(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, []);

  if (loading && models.length === 0) return <div className="text-sm text-gray-400">Loading model statuses…</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {models.map((m) => (
        <div key={m.platform} className="rounded-2xl shadow p-4 bg-neutral-900 text-gray-100 border border-neutral-700">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-lg">{m.platform}</h2>
            <span
              className={`h-3 w-3 rounded-full`}
              style={{ backgroundColor: m.color }}
              title={m.status}
            ></span>
          </div>
          <div className="text-sm mb-1">{m.status === 'cooldown' ? 'Cooldown' : m.status.replace('_', ' ')}</div>
          <div className="text-xs text-gray-400 mb-1">{m.last_message}</div>
          {m.cooldown_until && (
            <div className="text-xs text-gray-500 mb-1">
              Retry until {new Date(m.cooldown_until).toLocaleTimeString()}
            </div>
          )}
          <div className="text-xs text-gray-500">Updated {new Date(m.last_updated).toLocaleTimeString()}</div>

          {m.history && m.history.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-gray-400">Recent Events</summary>
              <ul className="text-xs text-gray-500 mt-1 space-y-1">
                {m.history.slice(-5).map((h, i) => (
                  <li key={i}>
                    <span className="font-semibold">{h.severity.toUpperCase()}</span> — {h.message}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};
