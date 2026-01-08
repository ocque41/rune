-- Migration: Create MCP server and tool management tables
-- Purpose: Track connected MCP servers and available tools

-- ============================================================================
-- Table: rune_mcp_servers
-- Stores connected MCP servers (Postgres, File System, Search, etc.)
-- ============================================================================
create table if not exists rune_mcp_servers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) not null,
  
  -- Server metadata
  name text not null, -- e.g., "Production Postgres", "Local Files"
  server_type text not null, -- e.g., "postgres", "filesystem", "search"
  description text,
  
  -- Connection status
  status text default 'disconnected' check (status in ('connected', 'disconnected', 'error')),
  last_verified_at timestamp with time zone,
  error_message text,
  
  -- Configuration (sensitive data stored separately via Supabase Vault or env vars)
  config jsonb default '{}'::jsonb, -- Non-sensitive config only
  
  -- Soft delete
  deleted_at timestamp with time zone
);

-- Indexes
create index idx_rune_mcp_servers_user_id on rune_mcp_servers(user_id);
create index idx_rune_mcp_servers_type on rune_mcp_servers(server_type);
create index idx_rune_mcp_servers_status on rune_mcp_servers(status);

-- ============================================================================
-- Table: rune_mcp_tools
-- Stores available tools from each server
-- ============================================================================
create table if not exists rune_mcp_tools (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Reference to server
  server_id uuid references rune_mcp_servers(id) on delete cascade not null,
  
  -- Tool metadata
  tool_name text not null, -- e.g., "query_database", "read_file", "web_search"
  display_name text not null,
  description text,
  category text, -- e.g., "database", "file_system", "api"
  
  -- Input schema (for validation and UI)
  input_schema jsonb default '{}'::jsonb,
  
  -- Capabilities
  capabilities jsonb default '[]'::jsonb, -- e.g., ["read", "write"]
  
  -- Ensure uniqueness per server
  constraint unique_tool_per_server unique(server_id, tool_name)
);

-- Indexes
create index idx_rune_mcp_tools_server_id on rune_mcp_tools(server_id);
create index idx_rune_mcp_tools_category on rune_mcp_tools(category);

-- ============================================================================
-- Table: rune_agent_tool_bindings
-- Links agent profiles to enabled tools (many-to-many)
-- ============================================================================
create table if not exists rune_agent_tool_bindings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- References
  agent_profile_id uuid references rune_agent_profiles(id) on delete cascade not null,
  tool_id uuid references rune_mcp_tools(id) on delete cascade not null,
  
  -- Binding configuration
  is_enabled boolean default true,
  priority integer default 0, -- Higher priority tools are suggested first
  
  -- Optional tool-specific config overrides
  config_overrides jsonb default '{}'::jsonb,
  
  -- Ensure uniqueness
  constraint unique_agent_tool_binding unique(agent_profile_id, tool_id)
);

-- Indexes
create index idx_rune_agent_tool_bindings_agent_id on rune_agent_tool_bindings(agent_profile_id);
create index idx_rune_agent_tool_bindings_tool_id on rune_agent_tool_bindings(tool_id);
create index idx_rune_agent_tool_bindings_enabled on rune_agent_tool_bindings(is_enabled) where is_enabled = true;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

alter table rune_mcp_servers enable row level security;
alter table rune_mcp_tools enable row level security;
alter table rune_agent_tool_bindings enable row level security;

-- MCP Servers: Users manage their own servers
create policy "Users can view own MCP servers"
  on rune_mcp_servers for select
  using (auth.uid() = user_id);

create policy "Users can insert own MCP servers"
  on rune_mcp_servers for insert
  with check (auth.uid() = user_id);

create policy "Users can update own MCP servers"
  on rune_mcp_servers for update
  using (auth.uid() = user_id);

create policy "Users can delete own MCP servers"
  on rune_mcp_servers for delete
  using (auth.uid() = user_id);

-- MCP Tools: Visible based on server ownership
create policy "Users can view tools from own servers"
  on rune_mcp_tools for select
  using (exists (
    select 1 from rune_mcp_servers
    where rune_mcp_servers.id = rune_mcp_tools.server_id
    and rune_mcp_servers.user_id = auth.uid()
  ));

-- Tool Bindings: Managed via agent profile ownership
create policy "Users can view own tool bindings"
  on rune_agent_tool_bindings for select
  using (exists (
    select 1 from rune_agent_profiles
    where rune_agent_profiles.id = rune_agent_tool_bindings.agent_profile_id
    and rune_agent_profiles.user_id = auth.uid()
  ));

create policy "Users can manage own tool bindings"
  on rune_agent_tool_bindings for all
  using (exists (
    select 1 from rune_agent_profiles
    where rune_agent_profiles.id = rune_agent_tool_bindings.agent_profile_id
    and rune_agent_profiles.user_id = auth.uid()
  ));

-- ============================================================================
-- Triggers
-- ============================================================================

create or replace function update_rune_mcp_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

create trigger set_rune_mcp_servers_updated_at
  before update on rune_mcp_servers
  for each row
  execute function update_rune_mcp_updated_at();

create trigger set_rune_mcp_tools_updated_at
  before update on rune_mcp_tools
  for each row
  execute function update_rune_mcp_updated_at();
