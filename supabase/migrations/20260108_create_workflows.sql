-- Migration: Create workflow definitions and versioning tables
-- Purpose: Store visual graphs and track immutable deployment versions

-- ============================================================================
-- Table: rune_workflows
-- Stores current workflow metadata (mutable)
-- ============================================================================
create table if not exists rune_workflows (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  
  -- Metadata
  name text not null,
  description text,
  
  -- Current state (mutable)
  graph jsonb not null default '{}'::jsonb, -- {nodes: [], edges: []}
  code text, -- Generated TypeScript workflow code
  
  -- Status
  is_active boolean default true,
  deleted_at timestamp with time zone
);

-- Indexes for performance
create index idx_rune_workflows_user_id on rune_workflows(user_id);
create index idx_rune_workflows_name on rune_workflows(name);
create index idx_rune_workflows_active on rune_workflows(is_active) where is_active = true;

-- ============================================================================
-- Table: rune_workflow_versions
-- Stores immutable snapshots of each deployment (append-only)
-- ============================================================================
create table if not exists rune_workflow_versions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Reference to parent workflow
  workflow_id uuid references rune_workflows(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  
  -- Version metadata
  version integer not null, -- Incrementing version number
  deployed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  deployed_by uuid references auth.users(id),
  
  -- Immutable snapshot
  graph jsonb not null, -- {nodes: [], edges: []} at time of deployment
  code text not null, -- Generated code at time of deployment
  
  -- Optional metadata
  commit_message text,
  
  -- Ensure uniqueness
  constraint unique_workflow_version unique(workflow_id, version)
);

-- Indexes
create index idx_rune_workflow_versions_workflow_id on rune_workflow_versions(workflow_id);
create index idx_rune_workflow_versions_user_id on rune_workflow_versions(user_id);
create index idx_rune_workflow_versions_version on rune_workflow_versions(workflow_id, version desc);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table rune_workflows enable row level security;
alter table rune_workflow_versions enable row level security;

-- Workflows: Users can CRUD their own workflows
create policy "Users can view own workflows"
  on rune_workflows for select
  using (auth.uid() = user_id);

create policy "Users can insert own workflows"
  on rune_workflows for insert
  with check (auth.uid() = user_id);

create policy "Users can update own workflows"
  on rune_workflows for update
  using (auth.uid() = user_id);

create policy "Users can delete own workflows"
  on rune_workflows for delete
  using (auth.uid() = user_id);

-- Versions: Users can read and insert (no updates/deletes - immutable)
create policy "Users can view own workflow versions"
  on rune_workflow_versions for select
  using (auth.uid() = user_id);

create policy "Users can insert own workflow versions"
  on rune_workflow_versions for insert
  with check (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
create or replace function update_rune_workflows_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_rune_workflows_updated_at
  before update on rune_workflows
  for each row
  execute function update_rune_workflows_updated_at();
