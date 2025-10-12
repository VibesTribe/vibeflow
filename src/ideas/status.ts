import fs from 'fs/promises';
import path from 'path';
import { directories } from '../config/paths';

export type IdeaStage =
  | 'idea_submitted'
  | 'research_completed'
  | 'analyst_approved'
  | 'prd_approved'
  | 'plan_generated'
  | 'supervisor_ready'
  | 'orchestration_started';

const STAGE_ORDER: IdeaStage[] = [
  'idea_submitted',
  'research_completed',
  'analyst_approved',
  'prd_approved',
  'plan_generated',
  'supervisor_ready',
  'orchestration_started'
];

export interface IdeaStatus {
  idea_id: string;
  stage: IdeaStage;
  history: Array<{ stage: IdeaStage; timestamp: string; notes?: string }>;
}

export async function loadIdeaStatus(ideaId: string): Promise<IdeaStatus> {
  const statusPath = path.join(directories.root, 'data/ideas', ideaId, 'status.json');
  const raw = await fs.readFile(statusPath, 'utf8');
  return JSON.parse(raw) as IdeaStatus;
}

export function ensureStageAtLeast(status: IdeaStatus, required: IdeaStage): void {
  const currentIndex = STAGE_ORDER.indexOf(status.stage);
  const requiredIndex = STAGE_ORDER.indexOf(required);
  if (requiredIndex === -1) {
    throw new Error(`Unknown stage '${required}'`);
  }
  if (currentIndex < requiredIndex) {
    throw new Error(
      `Idea '${status.idea_id}' is at stage '${status.stage}'. Requires '${required}' before proceeding.`
    );
  }
}

export async function assertIdeaReadyForPlanning(ideaId: string): Promise<void> {
  const status = await loadIdeaStatus(ideaId);
  ensureStageAtLeast(status, 'prd_approved');
}

export async function markIdeaStage(ideaId: string, stage: IdeaStage): Promise<void> {
  const statusPath = path.join(directories.root, 'data/ideas', ideaId, 'status.json');
  const status = await loadIdeaStatus(ideaId);
  const targetIndex = STAGE_ORDER.indexOf(stage);
  const currentIndex = STAGE_ORDER.indexOf(status.stage);
  if (targetIndex <= currentIndex) {
    return;
  }
  status.stage = stage;
  status.history.push({ stage, timestamp: new Date().toISOString() });
  await fs.writeFile(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf8');
}
