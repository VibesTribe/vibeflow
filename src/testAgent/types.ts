export interface TestValidationSpec {
  name: string;
  tool: string;
  [key: string]: unknown;
}

export interface TestAssignmentPayload {
  idea_id: string;
  slice_id?: string | null;
  task_id: string;
  source_attempt: number;
  test_attempt: number;
  assignment_type: string;
  platform: string;
  model?: string;
  branch: {
    work?: string;
    test?: string;
    review?: string;
  };
  validations: TestValidationSpec[];
  acceptance_criteria?: string[];
  deliverables?: string[];
  instructions?: string[];
  notes?: string[];
  metadata?: Record<string, unknown>;
}

export interface InProgressTestRecord {
  idea_id: string;
  slice_id?: string | null;
  task_id: string;
  source_attempt: number;
  test_attempt: number;
  assignment_type: string;
  platform: string;
  model?: string;
  branch: {
    work?: string;
    test?: string;
    review?: string;
  };
  validations: TestValidationSpec[];
  acceptance_criteria?: string[];
  deliverables?: string[];
  instructions?: string[];
  notes?: string[];
  metadata?: Record<string, unknown>;
  claimed_at: string;
  queue_path?: string;
}
