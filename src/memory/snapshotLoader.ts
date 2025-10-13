import { promises as fs } from 'fs';
import path from 'path';

interface SnapshotFile {
  path: string;
  size: number;
  modified: string;
  sha256: string;
}

const DEFAULT_SNAPSHOT = path.join(process.env.VIBEFLOW_ROOT ?? process.cwd(), 'docs', 'reports', 'repo-snapshot.json');

export async function loadSnapshot(snapshotPath: string = DEFAULT_SNAPSHOT): Promise<SnapshotFile[]> {
  try {
    const raw = await fs.readFile(snapshotPath, 'utf8');
    const payload = JSON.parse(raw);
    if (Array.isArray(payload.files)) {
      return payload.files as SnapshotFile[];
    }
    return [];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export async function pathExistsInSnapshot(targetPath: string, snapshot?: SnapshotFile[]): Promise<boolean> {
  const files = snapshot ?? (await loadSnapshot());
  const normalized = targetPath.replace(/\\/g, '/');
  return files.some((file) => file.path === normalized);
}

export async function assertPathsExist(paths: string[], snapshot?: SnapshotFile[]): Promise<{ missing: string[] }> {
  const files = snapshot ?? (await loadSnapshot());
  const set = new Set(files.map((file) => file.path));
  const missing = paths
    .map((p) => p.replace(/\\/g, '/'))
    .filter((p) => !set.has(p));
  return { missing };
}
