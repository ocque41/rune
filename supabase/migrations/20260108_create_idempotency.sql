-- Migration: Create idempotency keys table
-- Purpose: Deduplication of critical operations (start run, resume, etc.)

-- ============================================================================
-- Table: rune_idempotency_keys
-- Stores keys to ensure operations are processed only once
-- ============================================================================
create table if not exists rune_idempotency_keys (
  key text not null,
  user_id uuid references auth.users(id), -- Nullable for unauth webhooks (might rely on API key or signature)
  scope text not null, -- e.g., "start_run", "resume_run"
  
  -- Request/Response Details
  request_params jsonb, -- Hash or snapshot of params for verification
  response_body jsonb,  -- Cached successful response
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  
  error_message text,
  
  -- Timestamps
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone default (now() + interval '24 hours'), -- Auto-cleanup
  
  -- Identity
  primary key (key, scope)
);

-- Indexes
create index idx_rune_idempotency_keys_expires_at on rune_idempotency_keys(expires_at);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
alter table rune_idempotency_keys enable row level security;

create policy "Users can manage own idempotency keys"
  on rune_idempotency_keys for all
  using (auth.uid() = user_id or user_id is null); -- Allow if null for system ops, or restrict strictly

-- ============================================================================
-- Cleanup Function (Optional, can be run via cron)
-- ============================================================================
create or replace function cleanup_expired_idempotency_keys()
returns void as $$
begin
  delete from rune_idempotency_keys where expires_at < now();
end;
$$ language plpgsql;
