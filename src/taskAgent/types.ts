import type { AssignmentChannel as DispatcherAssignmentChannel } from "../orchestrator/dispatcher";

export type AssignmentChannel = DispatcherAssignmentChannel;

export interface AssignmentPayload {
  idea_id: string;
  slice_id: string;
  task_id: string;
  assignment_type: AssignmentChannel;
  platform: string;
  model: string;
  model_display?: string;
  requires_chat_url?: boolean;
  deliverables: string[];
  context: Record<string, unknown>;
  instructions: string[];
  acceptance_criteria: string[];
  validation?: unknown;
  notes?: string[];
  [key: string]: unknown;
}

export interface BranchGuidance {
  suggested: string;
  base: string;
  stage: string;
  description: string;
}

export interface InProgressRecord {
  idea_id: string;
  slice_id: string;
  task_id: string;
  assignment_type: AssignmentChannel;
  platform: string;
  model: string;
  attempt: number;
  claimed_at: string;
  branch: {
    work: BranchGuidance;
    test?: BranchGuidance;
    review?: BranchGuidance;
  };
  payload: AssignmentPayload;
  metadata?: Record<string, unknown>;
}
