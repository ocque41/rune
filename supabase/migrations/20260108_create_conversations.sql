-- Migration: Create conversation and artifact tables
-- Purpose: Store playground chat history and generated outputs

-- Note: rune_playground_snapshots table already exists for quick snapshots
-- This migration adds full conversation history and artifact tracking

-- ============================================================================
-- Table: rune_conversations
-- Stores conversation threads in the playground
-- ============================================================================
create table if not exists rune_conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  
  -- Conversation metadata
  title text, -- Auto-generated or user-provided
  
  -- Optional workflow association
  workflow_id uuid references rune_workflows(id) on delete set null,
  run_id uuid, -- References rune_workflow_runs(id) if conversation led to a run
  
  -- Agent configuration at conversation start
  agent_config jsonb not null, -- Snapshot of LLMConfig
  
  -- Conversation state
  status text default 'active' check (status in ('active', 'archived', 'deleted')),
  
  -- Statistics
  message_count integer default 0,
  total_tokens_used integer default 0,
  
  -- Soft delete
  deleted_at timestamp with time zone
);

-- Indexes
create index idx_rune_conversations_user_id on rune_conversations(user_id);
create index idx_rune_conversations_workflow_id on rune_conversations(workflow_id);
create index idx_rune_conversations_status on rune_conversations(status);
create index idx_rune_conversations_created_at on rune_conversations(created_at desc);

-- ============================================================================
-- Table: rune_conversation_messages
-- Stores individual messages within conversations
-- ============================================================================
create table if not exists rune_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Reference to conversation
  conversation_id uuid references rune_conversations(id) on delete cascade not null,
  
  -- Message metadata
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  
  -- Optional tool call information
  tool_call_id text, -- If this is a tool invocation
  tool_name text,
  tool_input jsonb,
  tool_output jsonb,
  
  -- Tokens used for this message (if role = assistant)
  tokens_used integer,
  
  -- Metadata
  metadata jsonb default '{}'::jsonb
);

-- Indexes
create index idx_rune_conversation_messages_conversation_id on rune_conversation_messages(conversation_id);
create index idx_rune_conversation_messages_role on rune_conversation_messages(role);
create index idx_rune_conversation_messages_created_at on rune_conversation_messages(created_at asc);

-- ============================================================================
-- Table: rune_artifacts
-- Stores generated outputs (code, configs, workflows, etc.)
-- ============================================================================
create table if not exists rune_artifacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  
  -- Artifact metadata
  title text not null,
  description text,
  artifact_type text not null, -- e.g., "workflow", "code", "config", "data"
  
  -- Origin tracking
  conversation_id uuid references rune_conversations(id) on delete set null,
  message_id uuid references rune_conversation_messages(id) on delete set null,
  
  -- Content
  content jsonb not null, -- Structured content (varies by type)
  content_text text, -- Plain text version for search
  
  -- Versioning
  version integer default 1,
  parent_artifact_id uuid references rune_artifacts(id) on delete set null, -- If this is a revision
  
  -- Status
  status text default 'draft' check (status in ('draft', 'published', 'archived')),
  
  -- Metadata
  tags text[] default array[]::text[],
  metadata jsonb default '{}'::jsonb,
  
  -- Soft delete
  deleted_at timestamp with time zone
);

-- Indexes
create index idx_rune_artifacts_user_id on rune_artifacts(user_id);
create index idx_rune_artifacts_conversation_id on rune_artifacts(conversation_id);
create index idx_rune_artifacts_type on rune_artifacts(artifact_type);
create index idx_rune_artifacts_status on rune_artifacts(status);
create index idx_rune_artifacts_created_at on rune_artifacts(created_at desc);
create index idx_rune_artifacts_tags on rune_artifacts using gin(tags);

-- Full-text search on content_text
create index idx_rune_artifacts_content_text on rune_artifacts using gin(to_tsvector('english', content_text));

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table rune_conversations enable row level security;
alter table rune_conversation_messages enable row level security;
alter table rune_artifacts enable row level security;

-- Conversations: Users manage their own
create policy "Users can view own conversations"
  on rune_conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert own conversations"
  on rune_conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own conversations"
  on rune_conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete own conversations"
  on rune_conversations for delete
  using (auth.uid() = user_id);

-- Messages: Visible based on conversation ownership
create policy "Users can view messages in own conversations"
  on rune_conversation_messages for select
  using (exists (
    select 1 from rune_conversations
    where rune_conversations.id = rune_conversation_messages.conversation_id
    and rune_conversations.user_id = auth.uid()
  ));

create policy "Users can insert messages in own conversations"
  on rune_conversation_messages for insert
  with check (exists (
    select 1 from rune_conversations
    where rune_conversations.id = rune_conversation_messages.conversation_id
    and rune_conversations.user_id = auth.uid()
  ));

-- Artifacts: Users manage their own
create policy "Users can view own artifacts"
  on rune_artifacts for select
  using (auth.uid() = user_id);

create policy "Users can insert own artifacts"
  on rune_artifacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own artifacts"
  on rune_artifacts for update
  using (auth.uid() = user_id);

create policy "Users can delete own artifacts"
  on rune_artifacts for delete
  using (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function update_rune_conversations_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_rune_conversations_updated_at
  before update on rune_conversations
  for each row
  execute function update_rune_conversations_updated_at();

create trigger set_rune_artifacts_updated_at
  before update on rune_artifacts
  for each row
  execute function update_rune_conversations_updated_at();

-- Auto-increment message count
create or replace function increment_conversation_message_count()
returns trigger as $$
begin
  update rune_conversations
  set message_count = message_count + 1
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

create trigger increment_message_count
  after insert on rune_conversation_messages
  for each row
  execute function increment_conversation_message_count();

-- Auto-update conversation title from first user message
create or replace function set_conversation_title_from_first_message()
returns trigger as $$
begin
  if new.role = 'user' and (
    select title is null from rune_conversations where id = new.conversation_id
  ) then
    update rune_conversations
    set title = substring(new.content from 1 for 60)
    where id = new.conversation_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger set_conversation_title
  after insert on rune_conversation_messages
  for each row
  execute function set_conversation_title_from_first_message();
