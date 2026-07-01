/**
 * KanbanBoard — Per-project todo/kanban panel
 * PIF Phase G: Displays project_todos from the dashboard batch
 */

import React, { useState, useCallback } from "react";

interface TodoItem {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  source?: string;
  sort_order?: number;
}

interface KanbanBoardProps {
  todos: TodoItem[];
  projectSlug: string;
  onStatusChange?: (id: number, newStatus: string) => void;
}

const COLUMNS = [
  { key: "backlog", label: "Backlog", color: "#6b7280" },
  { key: "in_progress", label: "In Progress", color: "#f59e0b" },
  { key: "review", label: "Review", color: "#3b82f6" },
  { key: "done", label: "Done", color: "#10b981" },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#6b7280",
  low: "#9ca3af",
};

function resolveGovAPI(): string {
  if (import.meta.env.VITE_GOVERNOR_API) return import.meta.env.VITE_GOVERNOR_API;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "https://webhooks.vibestribe.rocks";
  }
  return "http://localhost:8080";
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ todos, projectSlug, onStatusChange }) => {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [draggedId, setDraggedId] = useState<number | null>(null);

  const moveTo = useCallback(async (id: number, newStatus: string) => {
    const GOV_API = resolveGovAPI();
    try {
      await fetch(`${GOV_API}/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (onStatusChange) onStatusChange(id, newStatus);
    } catch (err) {
      console.warn("[KanbanBoard] Failed to update todo", err);
    }
  }, [onStatusChange]);

  const addTodo = useCallback(async () => {
    if (!newTitle.trim()) return;
    const GOV_API = resolveGovAPI();
    try {
      await fetch(`${GOV_API}/api/todos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_slug: projectSlug,
          title: newTitle.trim(),
          status: "backlog",
          priority: "medium",
        }),
      });
      setNewTitle("");
      setAdding(false);
    } catch (err) {
      console.warn("[KanbanBoard] Failed to create todo", err);
    }
  }, [newTitle, projectSlug]);

  const counts = COLUMNS.reduce((acc, col) => {
    acc[col.key] = todos.filter((t) => t.status === col.key).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="kanban-board">
      <div className="kanban-board__header">
        <span className="kanban-board__title">📋 Kanban</span>
        <span className="kanban-board__count">{todos.length} items</span>
        <button className="kanban-board__add" onClick={() => setAdding(!adding)}>
          {adding ? "✕" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div className="kanban-board__add-form">
          <input
            type="text"
            placeholder="New task title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            autoFocus
          />
        </div>
      )}

      <div className="kanban-board__columns">
        {COLUMNS.map((col) => {
          const items = todos.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className="kanban-column"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggedId !== null) {
                  moveTo(draggedId, col.key);
                  setDraggedId(null);
                }
              }}
            >
              <div className="kanban-column__header" style={{ borderColor: col.color }}>
                <span className="kanban-column__label">{col.label}</span>
                <span className="kanban-column__count">{counts[col.key] || 0}</span>
              </div>
              <div className="kanban-column__items">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="kanban-item"
                    draggable
                    onDragStart={() => setDraggedId(item.id)}
                    onDragEnd={() => setDraggedId(null)}
                  >
                    <div className="kanban-item__priority" style={{ background: PRIORITY_COLORS[item.priority] || "#6b7280" }} />
                    <div className="kanban-item__content">
                      <div className="kanban-item__title">{item.title}</div>
                      {item.category && <div className="kanban-item__category">{item.category}</div>}
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="kanban-column__empty">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
