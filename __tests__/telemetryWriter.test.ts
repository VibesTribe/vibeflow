/* eslint-disable @typescript-eslint/no-var-requires */
import { jest } from '@jest/globals';

type UpsertPayload = Record<string, unknown>;

const upsertMock: jest.MockedFunction<(payload: UpsertPayload) => Promise<{ error: null }>> = jest.fn(async () => ({ error: null }));
const fromMock: jest.MockedFunction<(table: string) => { upsert: typeof upsertMock }> = jest.fn(() => ({ upsert: upsertMock }));
const createClientMock: jest.MockedFunction<(url: string, key: string, options?: Record<string, unknown>) => { from: typeof fromMock }> = jest.fn(() => ({ from: fromMock }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock
}));

const getModelDefinitionMock: jest.MockedFunction<(id: string) => Promise<Record<string, unknown> | undefined>> = jest.fn();

jest.mock('../src/config/registry', () => ({
  getModelDefinition: (id: string) => getModelDefinitionMock(id)
}));

describe('publishTaskEvent', () => {
  beforeEach(() => {
    upsertMock.mockClear();
    fromMock.mockClear();
    createClientMock.mockClear();
    getModelDefinitionMock.mockReset();
    upsertMock.mockResolvedValue({ error: null });
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.TELEMETRY_SUPABASE_URL;
    delete process.env.TELEMETRY_SERVICE_ROLE_KEY;
    delete process.env.TELEMETRY_DISABLE_WRITE;
  });

  test('returns early when Supabase credentials are missing', async () => {
    const { publishTaskEvent } = await import('../src/telemetry/supabaseWriter');
    await expect(
      publishTaskEvent({
        ideaId: 'alpha',
        taskId: 'T1',
        attempt: 1,
        status: 'completed',
        platform: 'codex:cli',
        model: 'codex:cli'
      })
    ).resolves.toBeUndefined();
    expect(createClientMock).not.toHaveBeenCalled();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test('writes payload with token-derived equivalent cost', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
    getModelDefinitionMock.mockResolvedValue({
      cost_per_1k_prompt: 0.002,
      cost_per_1k_completion: 0.004
    });

    const module = await import('../src/telemetry/supabaseWriter');
    await module.publishTaskEvent({
      ideaId: 'beta',
      sliceId: 'S1',
      taskId: 'T2',
      attempt: 2,
      status: 'failed',
      platform: 'openrouter:deepseek-r1',
      model: 'openrouter:deepseek-r1',
      tokensPrompt: 100,
      tokensCompletion: 50,
      costActualUsd: 0.25,
      durationSeconds: 120,
      branch: { work: 'agent/beta/S1/T2/attempt-02' },
      fallbackUsed: 'openrouter:deepseek-r1 -> openrouter:gemini',
      metadata: { claimed_at: '2025-10-12T00:00:00Z' },
      reason: 'credits_exhausted'
    });

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('task_events');
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const payload = (upsertMock.mock.calls[0]?.[0] ?? {}) as UpsertPayload;
    expect(payload.idea_id).toBe('beta');
    expect(payload.slice_id).toBe('S1');
    expect(payload.status).toBe('failed');
    expect(payload.tokens_prompt).toBe(100);
    expect(payload.tokens_completion).toBe(50);
    expect(payload.cost_actual_usd).toBe(0.25);
    expect(Number(payload.cost_equivalent_usd)).toBeCloseTo(0.0004, 6);
    expect(payload.branch_work).toBe('agent/beta/S1/T2/attempt-02');
    expect(payload.fallback_used).toBe('openrouter:deepseek-r1 -> openrouter:gemini');
    expect(payload.reason).toBe('credits_exhausted');
  });
});



