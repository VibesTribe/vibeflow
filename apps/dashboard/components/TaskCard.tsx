import React from "react";
import { TaskSnapshot } from "@core/types";

type QualityStatus = "pass" | "fail" | "pending";

interface TaskCardProps {
  task: TaskSnapshot;
  qualityStatus?: QualityStatus;
}

const QUALITY_LABELS: Record<QualityStatus, string> = {
  pass: "Supervisor pass",
  fail: "Needs repair",
  pending: "In review",
};

const TaskCard: React.FC<TaskCardProps> = ({ task, qualityStatus = "pending" }) => {
  const qualityClass = `task-card__quality task-card__quality--${qualityStatus}`;

  return (
    <article className="task-card">
      <header className="task-card__header">
        <strong>{task.title}</strong>
        <span className="status-chip">{task.status}</span>
      </header>
      <div className="task-card__meta">
        <span className="task-card__owner">{task.owner ?? "Unassigned"}</span>
        <span className="task-card__confidence">{Math.round(task.confidence * 100)}% conf</span>
      </div>
      <footer className="task-card__footer">
        <span className="task-card__updated">Updated {new Date(task.updatedAt).toLocaleTimeString()}</span>
        <span className={qualityClass}>{QUALITY_LABELS[qualityStatus]}</span>
      </footer>
    </article>
  );
};

export default TaskCard;
