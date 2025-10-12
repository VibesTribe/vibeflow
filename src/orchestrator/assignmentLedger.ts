import { files } from '../config/paths';
import { appendJsonArray } from '../utils/jsonFile';

export type AssignmentStatus = 'assigned' | 'completed' | 'failed' | 'rerouted';

export interface AssignmentRecord {
  taskId: string;
  sliceId?: string;
  attempt: number;
  status: AssignmentStatus;
  platform: string;
  model: string;
  timestamp?: string;
  costUsd?: number;
  tokens?: {
    prompt: number;
    completion: number;
  };
  notes?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAssignment(record: AssignmentRecord): Promise<void> {
  const timestamp = record.timestamp ?? new Date().toISOString();
  const payload = { ...record, timestamp };
  await appendJsonArray(files.assignmentLog, payload);
}
