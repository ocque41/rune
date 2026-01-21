-- Migration: Create agent configuration presets
-- Purpose: Allow users to save and load named agent configurations (Juno settings)

create table if not exists rune_agent_presets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  user_id uuid references auth.users(id) not null,
  name text not null,
  
  -- The full configuration snapshot
  -- Includes: model, temperature, system_prompt, top_p, max_tokens, 
  -- tools (list of enabled tool names/IDs), tool_policies, etc.
  config jsonb not null default '{}'::jsonb,
  
  -- Description or metadata
  description text,
  is_favorite boolean default false
);

-- Indexes
create index idx_rune_agent_presets_user_id on rune_agent_presets(user_id);
create index idx_rune_agent_presets_name on rune_agent_presets(name);

-- RLS
alter table rune_agent_presets enable row level security;

create policy "Users can manage own presets"
  on rune_agent_presets for all
  using (auth.uid() = user_id);

-- Triggers for updated_at
create trigger set_rune_agent_presets_updated_at
  before update on rune_agent_presets
  for each row
  execute function update_rune_agent_profiles_updated_at(); -- Reusing existing function
