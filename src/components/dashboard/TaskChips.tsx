// src/components/dashboard/TaskChips.tsx
import React from "react";

type Props = {
  cfUsd?: number; // counterfactual API cost
  vfUsd?: number; // vibeflow actual cost
  roiPct?: number;
  attempts?: number;
  status?: "queued"|"running"|"done"|"failed";
  enabled?: boolean; // feature-flag to suppress if data is mocky or unwanted
};

function Chip({ label, value }: {label: string; value: string}){
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs rounded-2xl bg-muted">
      <span className="opacity-70 mr-1">{label}</span>{value}
    </span>
  );
}

function Stat({ label, value }: {label: string; value: string}){
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="opacity-60">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function TaskChips({ cfUsd=0, vfUsd=0, roiPct=0, attempts=0, status, enabled=true }: Props){
  if (!enabled) return null;
  const cf = isFinite(cfUsd) ? cfUsd.toFixed(2) : "—";
  const vf = isFinite(vfUsd) ? vfUsd.toFixed(2) : "—";
  const roi = isFinite(roiPct ?? 0) ? (roiPct ?? 0).toFixed(1) : "—";
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Chip label="CF $" value={cf} />
      <Chip label="VF $" value={vf} />
      <Chip label="ROI %" value={roi} />
      <Chip label="Attempts" value={String(attempts || 0)} />
      {status ? <Chip label="Status" value={status} /> : null}
    </div>
  );
}
