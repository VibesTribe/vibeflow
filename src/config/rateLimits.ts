import path from 'path';
import { directories } from './paths';
import { readJsonFile } from '../utils/jsonFile';

export type RateLimitMode = 'enforce' | 'monitor' | 'disabled';

export interface RateLimitRule {
  id: string;
  category?: string;
  mode: RateLimitMode;
  window_hours: number;
  max_assignments?: number;
  max_completed?: number;
  max_tokens?: number;
  max_cost_usd?: number;
  notes?: string;
}

interface RateLimitConfig {
  platforms?: RateLimitRule[];
}

let cachedRules: RateLimitRule[] | null = null;
let lastLoadedAt = 0;

const CONFIG_PATH = path.join(directories.root, 'data', 'policies', 'rate_limits.json');

async function loadConfig(): Promise<RateLimitConfig> {
  return readJsonFile<RateLimitConfig>(CONFIG_PATH, { platforms: [] });
}

export async function loadRateLimitRules(force = false): Promise<RateLimitRule[]> {
  const now = Date.now();
  if (!force && cachedRules && now - lastLoadedAt < 5000) {
    return cachedRules;
  }
  const config = await loadConfig();
  cachedRules = (config.platforms ?? []).map((rule) => ({
    ...rule,
    mode: rule.mode ?? 'monitor',
    window_hours: rule.window_hours ?? 24
  }));
  lastLoadedAt = now;
  return cachedRules;
}

export function clearRateLimitCache(): void {
  cachedRules = null;
  lastLoadedAt = 0;
}
