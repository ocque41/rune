-- Migration: Create agent profile configuration tables
-- Purpose: Store per-workflow agent intelligence settings

-- ============================================================================
-- Table: rune_agent_profiles
-- Stores LLM configuration and tool policies for each workflow's agent
-- ============================================================================
create table if not exists rune_agent_profiles (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Reference to workflow (one-to-one relationship)
  workflow_id uuid references rune_workflows(id) on delete cascade not null unique,
  user_id uuid references auth.users(id) not null,
  
  -- LLM Configuration
  model text not null default 'gpt-4-turbo', -- Model identifier
  temperature numeric(3,2) default 0.7 check (temperature >= 0 and temperature <= 2),
  top_p numeric(3,2) default 1.0 check (top_p >= 0 and top_p <= 1),
  max_tokens integer default 4096,
  
  -- System Instructions
  system_prompt text default 'You are a helpful AI assistant that helps build and execute workflows.',
  
  -- Tool Policies
  tools_enabled boolean default true, -- Global toggle
  auto_tool_selection boolean default true, -- Agent can choose tools automatically
  allowed_tool_categories jsonb default '["database", "api", "file_system"]'::jsonb,
  
  -- Advanced Settings
  json_mode boolean default false,
  stream_responses boolean default true,
  
  -- Optional metadata
  config_metadata jsonb default '{}'::jsonb
);

-- Indexes
create index idx_rune_agent_profiles_workflow_id on rune_agent_profiles(workflow_id);
create index idx_rune_agent_profiles_user_id on rune_agent_profiles(user_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table rune_agent_profiles enable row level security;

create policy "Users can view own agent profiles"
  on rune_agent_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert own agent profiles"
  on rune_agent_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update own agent profiles"
  on rune_agent_profiles for update
  using (auth.uid() = user_id);

create policy "Users can delete own agent profiles"
  on rune_agent_profiles for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function update_rune_agent_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_rune_agent_profiles_updated_at
  before update on rune_agent_profiles
  for each row
  execute function update_rune_agent_profiles_updated_at();

-- ============================================================================
-- Helper Function: Get or create default agent profile
-- ============================================================================

create or replace function get_or_create_agent_profile(p_workflow_id uuid, p_user_id uuid)
returns uuid as $$
declare
  v_profile_id uuid;
begin
  -- Try to find existing profile
  select id into v_profile_id
  from rune_agent_profiles
  where workflow_id = p_workflow_id;
  
  -- Create if doesn't exist
  if v_profile_id is null then
    insert into rune_agent_profiles (workflow_id, user_id)
    values (p_workflow_id, p_user_id)
    returning id into v_profile_id;
  end if;
  
  return v_profile_id;
end;
$$ language plpgsql security definer;
