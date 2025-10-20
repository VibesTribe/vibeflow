# ⚙️ Vibeflow Task DAG Guide

This document describes the structure, usage, and update process for **task DAG files** inside `data/tasks/`.  
It defines how Vibeflow represents work as an atomic dependency graph that the **Orchestrator**, **Supervisor**, and **Planner** agents can interpret deterministically.

---

## 🧭 Purpose

The **task DAG (Directed Acyclic Graph)** represents Vibeflow’s vertical slices and their constituent tasks.  
Each slice (e.g., Dashboard, Orchestrator, Agents, Data) has:
- A unique `slice` identifier  
- A collection of `tasks`  
- Each task has an ID, description, dependencies, owner, confidence level, and status  

This enables automated orchestration, dependency tracking, and clear context handoffs.

---

## 📂 File Map

| File | Purpose |
|------|----------|
| [`tasks_dag_v3.json`](tasks_dag_v3.json) | Canonical DAG for current development (latest) |
| `README_TASKS.md` | This guide (schema + update policy) |
| *(future)* `tasks_dag_v4.json` | Auto-generated successor (created by Planner agent) |

---

## 🧱 Schema Overview

Each DAG file is an array of **slice objects**, like so:

```json
[
  {
    "id": "S1",
    "slice": "dashboard_layer",
    "status": "in_progress",
    "confidence": 0.9,
    "tasks": [
      {
        "id": "T1.1",
        "description": "Implement Cardview base layout",
        "status": "done",
        "depends_on": [],
        "owner": "visual_agent"
      }
    ]
  }
]
