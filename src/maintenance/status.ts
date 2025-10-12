import fs from 'fs/promises';
import path from 'path';
import { directories } from '../config/paths';
import type { MaintenanceTask, MaintenancePriority } from './types';

export type MaintenanceState =
  | 'recommended'
  | 'supervisor_review'
  | 'supervisor_approved'
  | 'needs_revision'
  | 'maintenance_in_progress'
  | 'implemented'
  | 'watchlist';

export interface StatusRecord {
  id: string;
  title: string;
  source: string;
  priority: MaintenancePriority;
  status: MaintenanceState;
  created_at: string;
  updated_at: string;
  url?: string;
  tags?: string[];
  notes?: string;
}

interface StatusTable {
  items: StatusRecord[];
}

export function getStatusPath(): string {
  const root = process.env.VIBEFLOW_ROOT ? path.resolve(process.env.VIBEFLOW_ROOT) : directories.root;
  return path.join(root, 'data', 'maintenance', 'status.json');
}

async function ensureTable(): Promise<StatusTable> {
  const statusPath = getStatusPath();
  try {
    const raw = await fs.readFile(statusPath, 'utf8');
    const parsed = JSON.parse(raw) as StatusTable;
    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.warn('[maintenance] failed to read status table:', error);
    }
  }
  return { items: [] };
}

async function writeTable(table: StatusTable): Promise<void> {
  const statusPath = getStatusPath();
  await fs.mkdir(path.dirname(statusPath), { recursive: true });
  await fs.writeFile(statusPath, JSON.stringify(table, null, 2) + '
', 'utf8');
}

export async function loadStatusRecords(): Promise<StatusRecord[]> {
  const table = await ensureTable();
  return table.items;
}

export async function saveStatusRecords(records: StatusRecord[]): Promise<void> {
  await writeTable({ items: records });
}

export function mergeTasksIntoStatus(records: StatusRecord[], tasks: MaintenanceTask[]): StatusRecord[] {
  const existing = new Map(records.map((record) => [record.id, record]));
  const now = new Date().toISOString();

  for (const task of tasks) {
    if (existing.has(task.id)) {
      continue;
    }
    existing.set(task.id, {
      id: task.id,
      title: task.title,
      source: task.source,
      priority: task.priority,
      status: 'recommended',
      created_at: task.created_at,
      updated_at: now,
      url: task.url,
      tags: task.tags
    });
  }

  return Array.from(existing.values()).sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function updateStatusRecord(
  id: string,
  updates: Partial<Pick<StatusRecord, 'status' | 'notes' | 'priority' | 'url' | 'tags'>>
): Promise<StatusRecord | null> {
  const records = await loadStatusRecords();
  let changed: StatusRecord | null = null;

  const next = records.map((record) => {
    if (record.id !== id) {
      return record;
    }
    changed = {
      ...record,
      ...updates,
      updated_at: new Date().toISOString()
    };
    return changed;
  });

  if (!changed) {
    return null;
  }

  await saveStatusRecords(next);
  return changed;
}

export async function removeStatusRecord(id: string): Promise<void> {
  const records = await loadStatusRecords();
  const filtered = records.filter((record) => record.id !== id);
  await saveStatusRecords(filtered);
}
