import React from "react";

export default function TelemetryCard({ row, roi }) {
  return (
    <div className="bg-neutral-800 rounded-2xl p-4 shadow-md border border-neutral-700 hover:border-neutral-500 transition">
      <div className="text-sm text-gray-400 mb-2">{row.task_id}</div>
      <div className="text-lg font-semibold text-gray-100">{row.summary}</div>
      <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-gray-400">
        <div>Confidence</div>
        <div className="text-gray-200 text-right">{roi.confidence}</div>
        <div>Latency</div>
        <div className="text-gray-200 text-right">{roi.latency}</div>
        <div>Cost</div>
        <div className="text-gray-200 text-right">{roi.cost}</div>
        <div>ROI</div>
        <div className="text-gray-200 text-right">{roi.roi}</div>
      </div>
      <div className="mt-3 text-xs text-gray-500">
        Created: {new Date(row.created_at).toLocaleString()}
      </div>
    </div>
  );
}
