// src/orchestrator/recordAssignment.ts
// Thin service function for orchestrator to log assignment/reassignment events.
import { recordAssignmentEvent } from "../adapters/assignmentHistory";

type AssignArgs = {
  taskId: string;
  action: "assigned" | "reassigned" | "retry" | "completed" | "failed";
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
};

export async function recordAssignment(args: AssignArgs) {
  return recordAssignmentEvent(args.taskId, {
    action: args.action,
    platform: args.platform,
    model: args.model,
    external_chat_url: args.external_chat_url,
    reason: args.reason,
    notes: args.notes,
    est_tokens_prompt: args.est_tokens_prompt,
    est_tokens_output: args.est_tokens_output,
    counterfactual_api_cost_usd: args.counterfactual_api_cost_usd,
    vibeflow_cost_usd: args.vibeflow_cost_usd,
    attempt_idx: args.attempt_idx
  });
}
