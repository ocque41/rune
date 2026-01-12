-- Phase 1 Migration: Account-Aware Agent Context

-- A) Workflows: Add missing columns
ALTER TABLE rune_workflows 
ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- B) Workflow Versions
CREATE TABLE IF NOT EXISTS rune_workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES rune_workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  version_number INTEGER NOT NULL,
  definition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, version_number)
);

-- C) Workflow Drafts
CREATE TABLE IF NOT EXISTS rune_workflow_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES rune_workflows(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  draft_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id) -- One draft per workflow
);

-- D) Workflow Runs: Add missing columns
ALTER TABLE rune_runs
ADD COLUMN IF NOT EXISTS workflow_version_id UUID REFERENCES rune_workflow_versions(id),
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
ADD COLUMN IF NOT EXISTS error_json JSONB;

-- E) Run Steps
CREATE TABLE IF NOT EXISTS rune_run_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES rune_runs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  node_id TEXT NOT NULL,
  status TEXT NOT NULL check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  input_json JSONB,
  output_json JSONB,
  error_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- F) Agent Sessions
CREATE TABLE IF NOT EXISTS rune_agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  active_workflow_id UUID REFERENCES rune_workflows(id) ON DELETE SET NULL,
  active_draft_id UUID REFERENCES rune_workflow_drafts(id) ON DELETE SET NULL,
  active_run_id UUID REFERENCES rune_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G) Agent Messages
CREATE TABLE IF NOT EXISTS rune_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES rune_agent_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
  content TEXT,
  content_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_versions_lookup ON rune_workflow_versions(workflow_id, version_number);
CREATE INDEX IF NOT EXISTS idx_workflow_drafts_lookup ON rune_workflow_drafts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_run_steps_run_id ON rune_run_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON rune_agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_session ON rune_agent_messages(session_id);

-- RLS Policies (Phase 2 Preview - minimal setup to ensure access)
ALTER TABLE rune_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_workflow_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_run_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_agent_messages ENABLE ROW LEVEL SECURITY;

-- Standard user-owned policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own versions') THEN
        CREATE POLICY "Users manage their own versions" ON rune_workflow_versions
          USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own drafts') THEN
        CREATE POLICY "Users manage their own drafts" ON rune_workflow_drafts
          USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own run steps') THEN
        CREATE POLICY "Users manage their own run steps" ON rune_run_steps
          USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own agent sessions') THEN
        CREATE POLICY "Users manage their own agent sessions" ON rune_agent_sessions
          USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own agent messages') THEN
        CREATE POLICY "Users manage their own agent messages" ON rune_agent_messages
          USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
