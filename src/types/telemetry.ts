// src/types/telemetry.ts
export type AssignmentAction = "assigned" | "reassigned" | "retry" | "completed" | "failed";

export interface TaskAssignmentEvent {
  timestamp: string;                 // ISO date-time
  action: AssignmentAction;
  platform?: string;
  model?: string;
  external_chat_url?: string;
  reason?: string;
  notes?: string;
  est_tokens_prompt?: number;
  est_tokens_output?: number;
  counterfactual_api_cost_usd?: number;
  vibeflow_cost_usd?: number;
  attempt_idx?: number;
}

export interface TaskAssignmentHistory {
  task_id: string;
  events: TaskAssignmentEvent[];
}

export interface RunMetric {
  task_id: string;
  platform: string;
  model: string;
  tokens_prompt: number;
  tokens_output: number;
  cost_usd?: number;                 // Vibeflow's own API spend for this run (if any)
  latency_ms: number;
  success: boolean;
  retries?: number;
  validation_passed?: boolean;
  external_chat_url?: string;
  counterfactual_api_cost_usd?: number;
  est_tokens_prompt?: number;
  est_tokens_output?: number;
  attempt_idx?: number;
}

export interface CostTotals {
  vibeflow_cost_usd: number;
  counterfactual_api_cost_usd: number;
  savings_usd: number;
  roi_percent: number;
}

export interface CostLedger {
  scope: "task" | "slice" | "project";
  scope_id: string;
  totals: CostTotals;
  by_platform?: Array<{
    platform: string;
    model?: string;
    vibeflow_cost_usd: number;
    counterfactual_api_cost_usd: number;
  }>;
}
