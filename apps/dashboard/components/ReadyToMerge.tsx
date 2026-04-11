/**
 * vibeflow-meta:
 * id: apps/dashboard/components/ReadyToMerge.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: ready-to-merge
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:ready-to-merge */
import React from "react";
import { MergeCandidate } from "@core/types";

interface ReadyToMergeProps {
  candidates: MergeCandidate[];
}

const ReadyToMerge: React.FC<ReadyToMergeProps> = ({ candidates }) => {
  if (candidates.length === 0) {
    return <div>No branches are awaiting merge.</div>;
  }

  return (
    <div className="feed-list">
      {candidates.map((candidate) => (
        <div className="feed-item" key={candidate.branch}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{candidate.title}</strong>
            <span className="status-chip">{candidate.branch}</span>
          </div>
          <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>{candidate.summary}</div>
          <div style={{ marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }}>
            Checks: {candidate.checklist.filter(Boolean).length}/{candidate.checklist.length}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReadyToMerge;
/* @endeditable */
