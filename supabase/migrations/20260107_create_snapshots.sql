create table if not exists rune_playground_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  config jsonb not null,
  messages jsonb not null default '[]'::jsonb,
  graph_state jsonb,
  user_id uuid references auth.users(id)
);

-- Enable RLS
alter table rune_playground_snapshots enable row level security;

-- Policy: Allow reading own snapshots
create policy "Users can read own snapshots"
  on rune_playground_snapshots for select
  using (auth.uid() = user_id);

-- Policy: Allow inserting own snapshots
create policy "Users can insert own snapshots"
  on rune_playground_snapshots for insert
  with check (auth.uid() = user_id);
