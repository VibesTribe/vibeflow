import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { directories } from '../config/paths';
import type { DigestItem, MaintenanceDigestEnvelope, MaintenanceTask, MaintenancePriority } from './types';

const DEFAULT_PRIORITY: MaintenancePriority = 'medium';

function normalisePriority(value: unknown): MaintenancePriority {
  if (typeof value === 'string') {
    if (value.toLowerCase().startsWith('high')) return 'high';
    if (value.toLowerCase().startsWith('low')) return 'low';
  }
  return 'medium';
}

function buildTaskId(source: string, item: DigestItem): string {
  const hash = crypto.createHash('sha1');
  hash.update(source);
  hash.update(item.title ?? '');
  hash.update(item.url ?? '');
  return hash.digest('hex');
}

export async function readMaintenanceDigests(): Promise<MaintenanceDigestEnvelope[]> {
  const inboxDir = path.join(directories.root, 'data', 'maintenance', 'inbox');
  let files: string[] = [];
  try {
    files = await fs.readdir(inboxDir);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const digests: MaintenanceDigestEnvelope[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(inboxDir, file);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw) as MaintenanceDigestEnvelope;
      if (parsed && parsed.payload && typeof parsed.payload === 'object') {
        digests.push(parsed);
      }
    } catch (error) {
      console.warn(`[maintenance] failed to read digest ${file}:`, error);
    }
  }
  return digests;
}

export function digestItemsToTasks(envelope: MaintenanceDigestEnvelope): MaintenanceTask[] {
  const items = Array.isArray(envelope.payload?.items) ? envelope.payload.items : [];
  const tasks: MaintenanceTask[] = [];
  for (const item of items) {
    if (!item || typeof item.title !== 'string') continue;
    const priority = normalisePriority(item.priority ?? DEFAULT_PRIORITY);
    if (priority === 'low') continue;
    const task: MaintenanceTask = {
      id: buildTaskId(envelope.source, item),
      source: envelope.source,
      priority,
      title: item.title,
      summary: item.summary,
      url: item.url,
      tags: Array.isArray(item.tags) ? item.tags : [],
      created_at: envelope.imported_at
    };
    tasks.push(task);
  }
  return tasks;
}

export async function collectMaintenanceTasks(): Promise<MaintenanceTask[]> {
  const digests = await readMaintenanceDigests();
  const tasks: MaintenanceTask[] = [];
  for (const envelope of digests) {
    tasks.push(...digestItemsToTasks(envelope));
  }
  tasks.sort((a, b) => a.created_at.localeCompare(b.created_at));
  return tasks;
}
