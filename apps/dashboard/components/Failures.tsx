/**
 * vibeflow-meta:
 * id: apps/dashboard/components/Failures.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: failures
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:failures */
import React from "react";
import { FailureSnapshot } from "@core/types";

interface FailuresProps {
  failures: FailureSnapshot[];
}

const Failures: React.FC<FailuresProps> = ({ failures }) => {
  if (failures.length === 0) {
    return <div>All systems nominal.</div>;
  }

  return (
    <div className="feed-list">
      {failures.map((failure) => (
        <div className="feed-item" key={failure.id}>
          <div style={{ fontWeight: 600 }}>{failure.title}</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>{failure.summary}</div>
          <div style={{ marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }}>
            Reason code: {failure.reasonCode}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Failures;
/* @endeditable */
