-- Migration: Create detailed run step tracking
-- Purpose: Extend run tracking with per-step execution details

-- Note: rune_workflow_runs table already exists
-- This migration adds the granular step-level tracking

-- ============================================================================
-- Table: rune_run_steps
-- Stores execution details for each step within a workflow run
-- ============================================================================
create table if not exists rune_run_steps (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Reference to parent run
  run_id uuid not null, -- References rune_workflow_runs(id)
  user_id uuid references auth.users(id) not null,
  
  -- Step identification
  step_id text not null, -- Node ID from the graph
  step_label text not null,
  step_type text, -- e.g., "http_request", "ai_generation", "database_query"
  
  -- Execution tracking
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed', 'skipped', 'waiting')),
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration_ms integer,
  
  -- Step data
  input jsonb, -- Input parameters for this step
  output jsonb, -- Step result/output
  error jsonb, -- Error details if failed
  
  -- Logs specific to this step
  logs jsonb default '[]'::jsonb,
  
  -- Metadata
  retry_count integer default 0,
  metadata jsonb default '{}'::jsonb
);

-- Indexes for performance
create index idx_rune_run_steps_run_id on rune_run_steps(run_id);
create index idx_rune_run_steps_user_id on rune_run_steps(user_id);
create index idx_rune_run_steps_status on rune_run_steps(status);
create index idx_rune_run_steps_start_time on rune_run_steps(start_time desc);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table rune_run_steps enable row level security;

create policy "Users can view own run steps"
  on rune_run_steps for select
  using (auth.uid() = user_id);

create policy "Users can insert own run steps"
  on rune_run_steps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own run steps"
  on rune_run_steps for update
  using (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function update_rune_run_steps_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_rune_run_steps_updated_at
  before update on rune_run_steps
  for each row
  execute function update_rune_run_steps_updated_at();

-- Auto-calculate duration when end_time is set
create or replace function calculate_run_step_duration()
returns trigger as $$
begin
  if new.end_time is not null and new.start_time is not null then
    new.duration_ms = extract(epoch from (new.end_time - new.start_time)) * 1000;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_run_step_duration
  before insert or update on rune_run_steps
  for each row
  execute function calculate_run_step_duration();
