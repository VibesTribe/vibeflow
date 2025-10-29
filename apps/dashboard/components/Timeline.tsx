/**
 * vibeflow-meta:
 * id: apps/dashboard/components/Timeline.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: timeline
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:timeline */
import React from "react";
import { TaskSnapshot } from "@core/types";
import TaskCard from "./TaskCard";

interface TimelineProps {
  tasks: TaskSnapshot[];
  isLoading: boolean;
}

const order = [
  "assigned",
  "in_progress",
  "received",
  "supervisor_review",
  "testing",
  "supervisor_approval",
  "ready_to_merge",
  "complete",
];

const Timeline: React.FC<TimelineProps> = ({ tasks, isLoading }) => {
  if (isLoading && tasks.length === 0) {
    return <div>Loading task timeline…</div>;
  }

  const grouped = tasks.reduce<Record<string, TaskSnapshot[]>>((acc, task) => {
    acc[task.status] = acc[task.status] ?? [];
    acc[task.status].push(task);
    return acc;
  }, {});

  return (
    <div className="timeline-grid">
      {order.map((status) => (
        <section key={status}>
          <h3 style={{ textTransform: "uppercase", fontSize: "0.8rem", opacity: 0.7 }}>
            {status.replace(/_/g, " ")}
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {(grouped[status] ?? []).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
            {(grouped[status] ?? []).length === 0 && <div style={{ opacity: 0.5 }}>No tasks</div>}
          </div>
        </section>
      ))}
    </div>
  );
};

export default Timeline;
/* @endeditable */
