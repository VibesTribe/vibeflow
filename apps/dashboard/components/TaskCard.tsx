/**
 * vibeflow-meta:
 * id: apps/dashboard/components/TaskCard.tsx
 * task: REBUILD-V5
 * regions:
 *   - id: task-card
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:task-card */
import React from "react";
import { TaskSnapshot } from "@core/types";

interface TaskCardProps {
  task: TaskSnapshot;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  return (
    <article className="task-card">
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <strong>{task.title}</strong>
        <span className="status-chip">{task.status}</span>
      </header>
      <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>{task.owner ?? "Unassigned"}</div>
      <footer style={{ marginTop: 8, fontSize: "0.75rem", opacity: 0.9 }}>
        <div>Confidence: {(task.confidence * 100).toFixed(0)}%</div>
        <div>Updated: {new Date(task.updatedAt).toLocaleTimeString()}</div>
      </footer>
    </article>
  );
};

export default TaskCard;
/* @endeditable */
