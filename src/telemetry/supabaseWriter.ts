import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getModelDefinition } from '../config/registry';

interface TaskEventInput {
  ideaId: string;
  sliceId?: string;
  taskId: string;
  attempt: number;
  status: 'completed' | 'failed';
  platform: string;
  model: string;
  costActualUsd?: number;
  tokensPrompt?: number;
  tokensCompletion?: number;
  durationSeconds?: number;
  branch?: {
    work?: string;
    test?: string;
    review?: string;
    used?: string;
  };
  fallbackUsed?: string | null;
  metadata?: Record<string, unknown>;
  recordedAt?: string;
  reason?: string;
}

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (process.env.TELEMETRY_DISABLE_WRITE === '1') {
    return null;
  }

  const url = process.env.SUPABASE_URL || process.env.TELEMETRY_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.TELEMETRY_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }

  return cachedClient;
}

async function estimateEquivalentCost(modelId: string | undefined, tokensPrompt?: number, tokensCompletion?: number) {
  if (!modelId || (tokensPrompt == null && tokensCompletion == null)) {
    return undefined;
  }

  const model = await getModelDefinition(modelId);
  if (!model) {
    return undefined;
  }

  const promptCost = ((tokensPrompt ?? 0) / 1000) * (model.cost_per_1k_prompt ?? 0);
  const completionCost = ((tokensCompletion ?? 0) / 1000) * (model.cost_per_1k_completion ?? 0);
  const total = promptCost + completionCost;
  return Number(total.toFixed(6));
}

export async function publishTaskEvent(event: TaskEventInput): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }

  const costEquivalentUsd = await estimateEquivalentCost(event.model, event.tokensPrompt, event.tokensCompletion);

  const payload: Record<string, unknown> = {
    idea_id: event.ideaId,
    slice_id: event.sliceId ?? null,
    task_id: event.taskId,
    attempt: event.attempt,
    status: event.status,
    event_type: 'completion',
    platform: event.platform ?? null,
    model: event.model ?? null,
    cost_actual_usd: event.costActualUsd ?? null,
    cost_equivalent_usd: costEquivalentUsd ?? null,
    tokens_prompt: event.tokensPrompt ?? null,
    tokens_completion: event.tokensCompletion ?? null,
    duration_seconds: event.durationSeconds ?? null,
    branch_work: event.branch?.work ?? null,
    branch_test: event.branch?.test ?? null,
    branch_review: event.branch?.review ?? null,
    branch_used: event.branch?.used ?? null,
    fallback_used: event.fallbackUsed ?? null,
    metadata: event.metadata ?? {},
    reason: event.reason ?? null,
    recorded_at: event.recordedAt ?? new Date().toISOString()
  };

  const { error } = await client
    .from('task_events')
    .upsert(payload, { onConflict: 'idea_id,task_id,attempt' });

  if (error) {
    throw new Error(error.message || 'Failed to write task event to Supabase');
  }
}
