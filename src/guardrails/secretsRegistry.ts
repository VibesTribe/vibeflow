import { promises as fs } from 'fs';
import path from 'path';

export interface SecretRecord {
  name: string;
  description?: string;
  owner?: string;
  required?: boolean;
}

const REGISTRY_PATH = path.join(process.env.VIBEFLOW_ROOT ?? process.cwd(), 'data', 'tasks', 'secrets-registry.json');

async function readRegistry(): Promise<SecretRecord[]> {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, 'utf8');
    return JSON.parse(raw) as SecretRecord[];
  } catch (error: any) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function loadSecretsRegistry(): Promise<SecretRecord[]> {
  return readRegistry();
}

export async function isSecretRegistered(name: string): Promise<boolean> {
  const registry = await readRegistry();
  return registry.some((record) => record.name === name);
}

export async function assertSecretsRegistered(names: string[]): Promise<string[]> {
  const registry = await readRegistry();
  const set = new Set(registry.map((record) => record.name));
  return names.filter((name) => !set.has(name));
}
