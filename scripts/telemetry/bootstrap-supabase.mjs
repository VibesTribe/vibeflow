#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.TELEMETRY_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('[telemetry:bootstrap] Missing SUPABASE_DB_URL/TELEMETRY_DB_URL environment variable.');
  process.exit(1);
}

const statements = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto";`,
  `CREATE TABLE IF NOT EXISTS public.task_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      idea_id text NOT NULL,
      slice_id text NOT NULL,
      task_id text NOT NULL,
      attempt integer NOT NULL,
      status text NOT NULL,
      event_type text NOT NULL DEFAULT 'completion',
      platform text,
      model text,
      cost_actual_usd numeric(14, 6),
      cost_equivalent_usd numeric(14, 6),
      tokens_prompt integer,
      tokens_completion integer,
      tokens_total integer GENERATED ALWAYS AS (coalesce(tokens_prompt, 0) + coalesce(tokens_completion, 0)) STORED,
      duration_seconds integer,
      branch_work text,
      branch_test text,
      branch_review text,
      branch_used text,
      fallback_used text,
      reason text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      recorded_at timestamptz NOT NULL DEFAULT now()
    );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS task_events_unique_attempt ON public.task_events (idea_id, task_id, attempt);`,
  `CREATE INDEX IF NOT EXISTS task_events_recorded_at_idx ON public.task_events (recorded_at DESC);`,
  `CREATE INDEX IF NOT EXISTS task_events_status_idx ON public.task_events (status);`,
  `CREATE INDEX IF NOT EXISTS task_events_platform_idx ON public.task_events (platform);`,
  `CREATE INDEX IF NOT EXISTS task_events_model_idx ON public.task_events (model);`,
  `CREATE OR REPLACE VIEW public.task_event_rollup AS
      SELECT
        id,
        idea_id,
        slice_id,
        task_id,
        attempt,
        status,
        event_type,
        platform,
        model,
        cost_actual_usd,
        cost_equivalent_usd,
        (cost_equivalent_usd - COALESCE(cost_actual_usd, 0)) AS savings_usd,
        tokens_prompt,
        tokens_completion,
        tokens_total,
        duration_seconds,
        branch_work,
        branch_test,
        branch_review,
        branch_used,
        fallback_used,
        reason,
        metadata,
        recorded_at
      FROM public.task_events;`,
  `ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;`,
  `DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'task_events' AND policyname = 'task_events_read'
        ) THEN
          CREATE POLICY task_events_read ON public.task_events FOR SELECT USING (true);
        END IF;
      END
    $$;`
];

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('[telemetry:bootstrap] Connected to Supabase database.');
  try {
    await client.query('BEGIN');
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query('COMMIT');
    console.log('[telemetry:bootstrap] Schema ensured successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[telemetry:bootstrap] Failed:', error.message ?? error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();



