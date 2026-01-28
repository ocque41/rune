-- Create raw usage ledger
create table if not exists public.rune_agent_usage_events (
    id uuid not null default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    created_at timestamptz not null default now(),
    
    -- Context
    source text not null, -- 'playground_chat', 'autonomy_triage', 'autonomy_plan', 'autonomy_execute', etc.
    workflow_id uuid references public.rune_workflows(id),
    chat_id uuid references public.rune_chats(id),
    job_id uuid references public.rune_agent_jobs(id),
    step_id text,
    request_id text,
    
    -- Model Usage
    provider text not null default 'gemini',
    model text not null,
    input_tokens int default 0,
    output_tokens int default 0,
    total_tokens int default 0,
    cached_tokens int default 0,
    latency_ms int,
    
    -- Tool Usage
    tool_name text,
    tool_calls_count int default 0,
    is_high_impact_tool boolean default false,
    approval_status text, -- 'pending', 'approved', 'rejected'
    
    -- Costs
    estimated_cost_usd numeric(12,6),
    
    -- Metadata
    status text not null, -- 'success', 'error', 'blocked'
    metadata jsonb default '{}'::jsonb,
    
    primary key (id)
);

-- Indexes for performance
create index if not exists idx_rune_usage_user_created 
    on public.rune_agent_usage_events (user_id, created_at desc);

create index if not exists idx_rune_usage_job_created 
    on public.rune_agent_usage_events (job_id, created_at desc);

-- Create daily rollup table
create table if not exists public.rune_agent_usage_daily_rollup (
    user_id uuid not null references auth.users(id),
    day date not null,
    model text not null,
    source text not null,
    
    -- Aggregates
    input_tokens bigint default 0,
    output_tokens bigint default 0,
    total_tokens bigint default 0,
    cached_tokens bigint default 0,
    estimated_cost_usd numeric(12,6) default 0,
    
    calls_count int default 0,
    errors_count int default 0,
    tool_calls_count int default 0,
    high_impact_calls_count int default 0,
    
    primary key (user_id, day, model, source)
);

-- RLS Policies
alter table public.rune_agent_usage_events enable row level security;
alter table public.rune_agent_usage_daily_rollup enable row level security;

-- Events: Users see their own, Service Role inserts
create policy "Users can view own usage events"
    on public.rune_agent_usage_events for select
    using (auth.uid() = user_id);

-- Rollup: Users see their own
create policy "Users can view own usage rollup"
    on public.rune_agent_usage_daily_rollup for select
    using (auth.uid() = user_id);

-- Grant access to authenticated users
grant select on public.rune_agent_usage_events to authenticated;
grant select on public.rune_agent_usage_daily_rollup to authenticated;
