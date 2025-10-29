/**
 * vibeflow-meta:
 * id: apps/dashboard/components/LearningFeed.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: learning-feed
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:learning-feed */
import React from "react";
import { TaskSnapshot } from "@core/types";

interface LearningFeedProps {
  tasks: TaskSnapshot[];
}

const LearningFeed: React.FC<LearningFeedProps> = ({ tasks }) => {
  const items = tasks
    .flatMap((task) => (task.lessons ?? []).map((lesson) => ({ lesson, task })))
    .slice(0, 6);

  if (items.length === 0) {
    return <div>No new lessons logged.</div>;
  }

  return (
    <div className="feed-list">
      {items.map(({ lesson, task }, index) => (
        <div className="feed-item" key={`${task.id}-${index}`}>
          <div style={{ fontWeight: 600 }}>{lesson.title}</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.75 }}>{lesson.summary}</div>
          <div style={{ marginTop: 6, fontSize: "0.7rem", opacity: 0.6 }}>
            Source task: {task.title}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LearningFeed;
/* @endeditable */

