/**
 * vibeflow-meta:
 * id: src/core/types.ts
 * task: REBUILD-V5
 * regions:
 *   - id: core-types
 *     hash: 00000000
 * locked: false
 * last_commit: null
 */

/* @editable:core-types */
export type TaskStatus =
  | "assigned"
  | "in_progress"
  | "received"
  | "supervisor_review"
  | "testing"
  | "supervisor_approval"
  | "ready_to_merge"
  | "complete"
  | "blocked";

export interface TaskSnapshot {
  id: string;
  title: string;
  status: TaskStatus;
  confidence: number;
  updatedAt: string;
  owner?: string | null;
  lessons?: Array<{ title: string; summary: string }>;
}

export interface AgentSnapshot {
  id: string;
  name: string;
  status: string;
  summary: string;
  updatedAt: string;
}

export interface FailureSnapshot {
  id: string;
  title: string;
  summary: string;
  reasonCode: string;
}

export interface MergeCandidate {
  branch: string;
  title: string;
  summary: string;
  checklist: boolean[];
}

export interface LifecycleEvent {
  id: string;
  taskId: string;
  type: string;
  timestamp: string;
  details?: Record<string, unknown>;
  reasonCode?: string;
}

export interface TaskPacket {
  taskId: string;
  title: string;
  objectives: string[];
  deliverables: string[];
  confidence: number;
  editScope: string[];
  metadata?: Record<string, unknown>;
}

export interface SkillInvocation {
  id: string;
  skillId: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SkillResult {
  status: "completed" | "failed";
  output: Record<string, unknown>;
  error?: string;
}

export interface OrchestratorContext {
  tasks: TaskSnapshot[];
  agents: AgentSnapshot[];
  metrics: Record<string, number>;
}

export interface RouterDecision {
  skillId: string;
  provider: string;
  confidence: number;
}

export interface WatcherAlert {
  taskId: string;
  reasonCode: string;
  createdAt: string;
}
/* @endeditable */
