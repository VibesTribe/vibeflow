import { promises as fs } from 'fs';
import path from 'path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const buffer = await fs.readFile(filePath, 'utf8');
    const sanitized = buffer.replace(/^\uFEFF/, '');
    return JSON.parse(sanitized) as T;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return fallback;
    }
    throw error;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, serialized + '\n', 'utf8');
}

export async function appendJsonArray<T extends Record<string, unknown>>(
  filePath: string,
  entry: T
): Promise<T[]> {
  const current = await readJsonFile<T[]>(filePath, []);
  current.push(entry);
  await writeJsonFile(filePath, current);
  return current;
}
