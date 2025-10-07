create table if not exists public.v_events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  task_id text,
  slice_id text,
  platform text,
  model text,
  severity text default 'info',
  payload jsonb default '{}',
  created_at timestamptz default now()
);
alter table public.v_events enable row level security;
create policy v_events_read for select on public.v_events using (true);

create table if not exists public.tasks (
  id text primary key,
  slice_id text,
  title text,
  platform text,
  state text,
  progress int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks enable row level security;
create policy tasks_read for select on public.tasks using (true);
