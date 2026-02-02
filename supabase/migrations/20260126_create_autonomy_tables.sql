-- Autonomy runtime tables

-- Agent events
CREATE TABLE IF NOT EXISTS rune_agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES rune_workflows(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processing_metadata JSONB
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_events_dedupe
  ON rune_agent_events (dedupe_key);
CREATE INDEX IF NOT EXISTS idx_agent_events_status
  ON rune_agent_events (status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_events_user
  ON rune_agent_events (user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_events_workflow
  ON rune_agent_events (workflow_id, status);

-- Agent jobs
CREATE TABLE IF NOT EXISTS rune_agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES rune_workflows(id) ON DELETE SET NULL,
  event_id UUID REFERENCES rune_agent_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT NOT NULL DEFAULT 'normal',
  plan JSONB,
  result JSONB,
  context JSONB,
  approval_responded_at TIMESTAMPTZ,
  approval_response JSONB,
  leased_until TIMESTAMPTZ,
  worker_id TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_status
  ON rune_agent_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_user
  ON rune_agent_jobs (user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_event
  ON rune_agent_jobs (event_id);

-- Agent decisions (audit trail)
CREATE TABLE IF NOT EXISTS rune_agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES rune_agent_jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  decision JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_job
  ON rune_agent_decisions (job_id);

-- Autonomy policies
CREATE TABLE IF NOT EXISTS rune_autonomy_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES rune_workflows(id) ON DELETE SET NULL,
  policy JSONB NOT NULL,
  tool_allowlist TEXT[],
  tool_blocklist TEXT[],
  domain_allowlist TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, workflow_id)
);

CREATE INDEX IF NOT EXISTS idx_autonomy_policies_user
  ON rune_autonomy_policies (user_id);
CREATE INDEX IF NOT EXISTS idx_autonomy_policies_workflow
  ON rune_autonomy_policies (workflow_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS rune_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'agent',
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON rune_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON rune_notifications (user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE rune_agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_autonomy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE rune_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own agent events') THEN
    CREATE POLICY "Users manage their own agent events" ON rune_agent_events
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own agent jobs') THEN
    CREATE POLICY "Users manage their own agent jobs" ON rune_agent_jobs
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own agent decisions') THEN
    CREATE POLICY "Users manage their own agent decisions" ON rune_agent_decisions
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own autonomy policies') THEN
    CREATE POLICY "Users manage their own autonomy policies" ON rune_autonomy_policies
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own notifications') THEN
    CREATE POLICY "Users manage their own notifications" ON rune_notifications
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
