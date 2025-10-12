#!/usr/bin/env node
/**
 * Aggregate assignment + supervisor logs into dashboard-friendly state.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const assignmentLogPath = path.join(ROOT, 'data', 'state', 'assignment.log.json');
const supervisorLogPath = path.join(ROOT, 'data', 'state', 'supervisor.log.json');
const taskStatePath = path.join(ROOT, 'data', 'state', 'task.state.json');
const metricsPath = path.join(ROOT, 'data', 'metrics', 'run_metrics.json');

async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

function toDate(value) {
  return value ? new Date(value).getTime() : 0;
}

function aggregateTasks(assignments, validations) {
  const map = new Map();

  assignments.forEach((entry) => {
    const key = entry.taskId;
    if (!map.has(key)) {
      map.set(key, {
        taskId: entry.taskId,
        sliceId: entry.sliceId ?? null,
        attempts: 0,
        history: [],
        latest: null
      });
    }
    const task = map.get(key);
    task.attempts += 1;
    task.history.push({
      type: 'assignment',
      status: entry.status,
      timestamp: entry.timestamp,
      platform: entry.platform,
      model: entry.model,
      notes: entry.notes ?? null
    });
    if (!task.latest || toDate(entry.timestamp) >= toDate(task.latest.timestamp)) {
      task.latest = {
        status: entry.status,
        timestamp: entry.timestamp,
        platform: entry.platform,
        model: entry.model
      };
    }
  });

  validations.forEach((entry) => {
    const key = entry.taskId;
    if (!map.has(key)) {
      map.set(key, {
        taskId: entry.taskId,
        sliceId: entry.sliceId ?? null,
        attempts: 0,
        history: [],
        latest: null
      });
    }
    const task = map.get(key);
    task.history.push({
      type: 'validation',
      status: entry.status,
      timestamp: entry.timestamp,
      reviewer: entry.reviewer,
      rerouteTo: entry.rerouteTo ?? null,
      notes: entry.notes ?? null
    });
    if (!task.latest || toDate(entry.timestamp) >= toDate(task.latest.timestamp)) {
      task.latest = {
        status: entry.status === 'pass' ? 'validated' : 'failed',
        timestamp: entry.timestamp,
        reviewer: entry.reviewer
      };
    }
  });

  const tasks = Array.from(map.values()).map((task) => {
    const sortedHistory = task.history.sort((a, b) => toDate(a.timestamp) - toDate(b.timestamp));
    return {
      taskId: task.taskId,
      sliceId: task.sliceId,
      attempts: task.attempts,
      latestStatus: task.latest?.status ?? 'unknown',
      lastUpdated: task.latest?.timestamp ?? null,
      lastPlatform: task.latest?.platform ?? null,
      lastModel: task.latest?.model ?? null,
      history: sortedHistory
    };
  });

  tasks.sort((a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0));

  const totals = {
    tasks: tasks.length,
    completed: tasks.filter((t) => t.latestStatus === 'completed' || t.latestStatus === 'validated').length,
    failed: tasks.filter((t) => t.latestStatus === 'failed').length,
    running: tasks.filter((t) => t.latestStatus === 'assigned').length,
    queued: tasks.filter((t) => t.latestStatus === 'unknown').length
  };

  const byPlatform = assignments.reduce((acc, entry) => {
    const key = entry.platform || 'unknown';
    if (!acc[key]) {
      acc[key] = { attempts: 0, lastModel: entry.model ?? null };
    }
    acc[key].attempts += 1;
    acc[key].lastModel = entry.model ?? acc[key].lastModel;
    return acc;
  }, {});

  return { tasks, stats: { totals, byPlatform } };
}

function aggregateMetrics(assignments) {
  const totals = {
    cost_usd: 0,
    tokens_prompt: 0,
    tokens_completion: 0,
    attempts: assignments.length
  };

  const byPlatform = {};

  assignments.forEach((entry) => {
    const cost = Number(entry.costUsd ?? 0);
    const prompt = Number(entry.tokens?.prompt ?? 0);
    const completion = Number(entry.tokens?.completion ?? 0);
    const platform = entry.platform || 'unknown';

    totals.cost_usd += cost;
    totals.tokens_prompt += prompt;
    totals.tokens_completion += completion;

    if (!byPlatform[platform]) {
      byPlatform[platform] = { cost_usd: 0, attempts: 0, tokens_prompt: 0, tokens_completion: 0 };
    }
    const bucket = byPlatform[platform];
    bucket.cost_usd += cost;
    bucket.attempts += 1;
    bucket.tokens_prompt += prompt;
    bucket.tokens_completion += completion;
  });

  return { totals, byPlatform };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const assignments = await readJson(assignmentLogPath);
  const validations = await readJson(supervisorLogPath);
  const { tasks, stats } = aggregateTasks(assignments, validations);

  const taskState = {
    generated_at: new Date().toISOString(),
    stats,
    tasks
  };
  await writeJson(taskStatePath, taskState);

  const metrics = {
    generated_at: new Date().toISOString(),
    ...aggregateMetrics(assignments)
  };
  await writeJson(metricsPath, metrics);

  console.log('Telemetry state updated.');
}

main().catch((error) => {
  console.error('[telemetry:update] failed:', error);
  process.exit(1);
});
