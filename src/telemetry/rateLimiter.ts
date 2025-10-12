import { files } from '../config/paths';
import { loadRateLimitRules, RateLimitRule } from '../config/rateLimits';
import { readJsonFile } from '../utils/jsonFile';

interface AssignmentLogEntry {
  taskId: string;
  status: string;
  platform?: string;
  model?: string;
  timestamp?: string;
  tokens?: { prompt?: number; completion?: number };
  costUsd?: number;
}

export interface RateLimitCounters {
  assignments: number;
  completed: number;
  failed: number;
  tokens: number;
  costUsd: number;
}

export interface RateLimitEvaluation {
  rule: RateLimitRule;
  allowed: boolean;
  status: 'ok' | 'exceeded';
  reason?: string;
  counters: RateLimitCounters;
  windowStartedAt: string;
  windowResetAt?: string;
}

let cachedAssignments: AssignmentLogEntry[] | null = null;
let cachedAssignmentsLoadedAt = 0;

async function loadAssignments(): Promise<AssignmentLogEntry[]> {
  const now = Date.now();
  if (cachedAssignments && now - cachedAssignmentsLoadedAt < 5000) {
    return cachedAssignments;
  }
  const entries = await readJsonFile<AssignmentLogEntry[]>(files.assignmentLog, []);
  cachedAssignments = entries;
  cachedAssignmentsLoadedAt = now;
  return entries;
}

function withinWindow(entry: AssignmentLogEntry, start: number): boolean {
  if (!entry.timestamp) return false;
  const ts = Date.parse(entry.timestamp);
  if (Number.isNaN(ts)) return false;
  return ts >= start;
}

function aggregate(entries: AssignmentLogEntry[]): RateLimitCounters {
  return entries.reduce<RateLimitCounters>((acc, entry) => {
    if (entry.status === 'assigned') {
      acc.assignments += 1;
    } else if (entry.status === 'completed') {
      acc.completed += 1;
    } else if (entry.status === 'failed') {
      acc.failed += 1;
    }
    const prompt = entry.tokens?.prompt ?? 0;
    const completion = entry.tokens?.completion ?? 0;
    acc.tokens += prompt + completion;
    acc.costUsd += Number(entry.costUsd ?? 0);
    return acc;
  }, { assignments: 0, completed: 0, failed: 0, tokens: 0, costUsd: 0 });
}

function evaluateCounters(rule: RateLimitRule, counters: RateLimitCounters): { allowed: boolean; status: 'ok' | 'exceeded'; reason?: string } {
  let exceeded = false;
  let reason: string | undefined;
  if (typeof rule.max_assignments === 'number' && counters.assignments >= rule.max_assignments) {
    exceeded = true;
    reason = 'assignments';
  }
  if (!exceeded && typeof rule.max_completed === 'number' && counters.completed >= rule.max_completed) {
    exceeded = true;
    reason = 'completed';
  }
  if (!exceeded && typeof rule.max_tokens === 'number' && counters.tokens >= rule.max_tokens) {
    exceeded = true;
    reason = 'tokens';
  }
  if (!exceeded && typeof rule.max_cost_usd === 'number' && counters.costUsd >= rule.max_cost_usd) {
    exceeded = true;
    reason = 'cost';
  }
  const allowed = rule.mode !== 'enforce' || !exceeded;
  return { allowed, status: exceeded ? 'exceeded' : 'ok', reason };
}

export async function evaluateRateLimit(platformId: string, now: Date = new Date()): Promise<RateLimitEvaluation | null> {
  const rules = await loadRateLimitRules();
  const rule = rules.find((item) => item.id === platformId);
  if (!rule || rule.mode === 'disabled') {
    return null;
  }
  const windowMs = (rule.window_hours ?? 24) * 60 * 60 * 1000;
  const windowStart = now.getTime() - windowMs;
  const assignments = await loadAssignments();
  const entriesInWindow = assignments.filter((entry) => entry.platform === platformId && withinWindow(entry, windowStart));
  const counters = aggregate(entriesInWindow);
  const evaluation = evaluateCounters(rule, counters);

  let resetAt: string | undefined;
  const timestamps = entriesInWindow
    .map((entry) => (entry.timestamp ? Date.parse(entry.timestamp) : Number.NaN))
    .filter((value) => !Number.isNaN(value));
  if (timestamps.length) {
    const earliest = Math.min(...timestamps);
    resetAt = new Date(earliest + windowMs).toISOString();
  }

  return {
    rule,
    allowed: evaluation.allowed,
    status: evaluation.status,
    reason: evaluation.reason,
    counters,
    windowStartedAt: new Date(windowStart).toISOString(),
    windowResetAt: resetAt
  };
}

export async function isPlatformAllowed(platformId: string, now: Date = new Date()): Promise<{ allowed: boolean; evaluation: RateLimitEvaluation | null }> {
  const evaluation = await evaluateRateLimit(platformId, now);
  if (!evaluation) {
    return { allowed: true, evaluation: null };
  }
  return { allowed: evaluation.allowed, evaluation };
}

export function clearRateLimitCaches(): void {
  cachedAssignments = null;
  cachedAssignmentsLoadedAt = 0;
}
