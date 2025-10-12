import { promises as fs } from 'fs';
import path from 'path';

export interface MemoryEntry {
  kind: 'plan' | 'supervisor' | 'watcher' | 'orchestrator';
  taskId?: string;
  sliceId?: string;
  summary: string;
  tags?: string[];
  timestamp?: string;
}

const MEMORY_PATH = path.join(process.env.VIBEFLOW_ROOT ?? process.cwd(), 'data', 'state', 'memory.log.json');

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readMemory(): Promise<MemoryEntry[]> {
  try {
    const raw = await fs.readFile(MEMORY_PATH, 'utf8');
    return JSON.parse(raw) as MemoryEntry[];
  } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function appendMemory(entry: MemoryEntry): Promise<void> {
  const payload = { ...entry, timestamp: entry.timestamp ?? new Date().toISOString() };
  const history = await readMemory();
  history.push(payload);
  await ensureDir(MEMORY_PATH);
  await fs.writeFile(MEMORY_PATH, JSON.stringify(history, null, 2) + '\n', 'utf8');
}

export async function listMemory(): Promise<MemoryEntry[]> {
  return readMemory();
}
