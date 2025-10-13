import { files } from '../config/paths';
import { appendJsonArray } from '../utils/jsonFile';

export type ValidationStatus = 'pass' | 'fail';

export interface ValidationCheckpoint {
  name: string;
  status: ValidationStatus;
  details?: string;
}

export interface ValidationOutcome {
  taskId: string;
  sliceId?: string;
  status: ValidationStatus;
  checkpoints: ValidationCheckpoint[];
  reviewer: 'supervisor' | 'watcher' | 'human';
  rerouteTo?: string;
  notes?: string;
  timestamp?: string;
}

export async function recordValidationOutcome(outcome: ValidationOutcome): Promise<void> {
  const timestamp = outcome.timestamp ?? new Date().toISOString();
  const payload = { ...outcome, timestamp };
  await appendJsonArray(files.supervisorLog, payload);
}
