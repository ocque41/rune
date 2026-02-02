-- Autonomy schema delta: settings, job queue, audit

-- =========================
-- Autonomy settings (policies)
-- =========================

-- Ensure per-user uniqueness for default + workflow-specific policies
CREATE UNIQUE INDEX IF NOT EXISTS idx_rune_autonomy_policies_user_default
  ON public.rune_autonomy_policies (user_id)
  WHERE workflow_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rune_autonomy_policies_user_workflow
  ON public.rune_autonomy_policies (user_id, workflow_id)
  WHERE workflow_id IS NOT NULL;

-- Keep updated_at current
CREATE OR REPLACE FUNCTION update_rune_autonomy_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_rune_autonomy_policies_updated_at ON public.rune_autonomy_policies;
CREATE TRIGGER set_rune_autonomy_policies_updated_at
  BEFORE UPDATE ON public.rune_autonomy_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_rune_autonomy_policies_updated_at();

-- =========================
-- Job queue (agent jobs)
-- =========================

ALTER TABLE public.rune_agent_jobs
  ADD COLUMN IF NOT EXISTS triage_result jsonb,
  ADD COLUMN IF NOT EXISTS actions_taken jsonb[] DEFAULT ARRAY[]::jsonb[],
  ADD COLUMN IF NOT EXISTS tokens_used integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_rune_agent_jobs_user_created
  ON public.rune_agent_jobs (user_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_rune_agent_jobs_status_updated
  ON public.rune_agent_jobs (status, updated_at desc);

-- =========================
-- Audit (agent decisions)
-- =========================

CREATE TABLE IF NOT EXISTS public.rune_agent_decisions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.rune_agent_jobs(id) on delete cascade,
  decision_type text not null, -- 'triage' | 'plan' | 'tool_call' | 'approval_request' | 'approval_response'
  input_summary jsonb,
  output_summary jsonb,
  model_used text,
  tokens_in integer,
  tokens_out integer,
  duration_ms integer,
  metadata jsonb default '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_rune_agent_decisions_job_created
  ON public.rune_agent_decisions (job_id, created_at desc);

CREATE INDEX IF NOT EXISTS idx_rune_agent_decisions_user_created
  ON public.rune_agent_decisions (user_id, created_at desc);

-- =========================
-- RLS policies
-- =========================

ALTER TABLE public.rune_autonomy_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rune_agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rune_agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rune_agent_decisions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Autonomy policies
  DROP POLICY IF EXISTS "autonomy_policies_select" ON public.rune_autonomy_policies;
  DROP POLICY IF EXISTS "autonomy_policies_insert" ON public.rune_autonomy_policies;
  DROP POLICY IF EXISTS "autonomy_policies_update" ON public.rune_autonomy_policies;
  DROP POLICY IF EXISTS "autonomy_policies_delete" ON public.rune_autonomy_policies;

  CREATE POLICY "autonomy_policies_select"
    ON public.rune_autonomy_policies FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "autonomy_policies_insert"
    ON public.rune_autonomy_policies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "autonomy_policies_update"
    ON public.rune_autonomy_policies FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "autonomy_policies_delete"
    ON public.rune_autonomy_policies FOR DELETE
    USING (auth.uid() = user_id);

  -- Agent events
  DROP POLICY IF EXISTS "agent_events_select" ON public.rune_agent_events;
  DROP POLICY IF EXISTS "agent_events_insert" ON public.rune_agent_events;
  DROP POLICY IF EXISTS "agent_events_update" ON public.rune_agent_events;
  DROP POLICY IF EXISTS "agent_events_delete" ON public.rune_agent_events;

  CREATE POLICY "agent_events_select"
    ON public.rune_agent_events FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "agent_events_insert"
    ON public.rune_agent_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "agent_events_update"
    ON public.rune_agent_events FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "agent_events_delete"
    ON public.rune_agent_events FOR DELETE
    USING (auth.uid() = user_id);

  -- Agent jobs
  DROP POLICY IF EXISTS "agent_jobs_select" ON public.rune_agent_jobs;
  DROP POLICY IF EXISTS "agent_jobs_insert" ON public.rune_agent_jobs;
  DROP POLICY IF EXISTS "agent_jobs_update" ON public.rune_agent_jobs;
  DROP POLICY IF EXISTS "agent_jobs_delete" ON public.rune_agent_jobs;

  CREATE POLICY "agent_jobs_select"
    ON public.rune_agent_jobs FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "agent_jobs_insert"
    ON public.rune_agent_jobs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "agent_jobs_update"
    ON public.rune_agent_jobs FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "agent_jobs_delete"
    ON public.rune_agent_jobs FOR DELETE
    USING (auth.uid() = user_id);

  -- Agent decisions (audit)
  DROP POLICY IF EXISTS "agent_decisions_select" ON public.rune_agent_decisions;
  DROP POLICY IF EXISTS "agent_decisions_insert" ON public.rune_agent_decisions;
  DROP POLICY IF EXISTS "agent_decisions_update" ON public.rune_agent_decisions;
  DROP POLICY IF EXISTS "agent_decisions_delete" ON public.rune_agent_decisions;

  CREATE POLICY "agent_decisions_select"
    ON public.rune_agent_decisions FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "agent_decisions_insert"
    ON public.rune_agent_decisions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "agent_decisions_update"
    ON public.rune_agent_decisions FOR UPDATE
    USING (auth.uid() = user_id);

  CREATE POLICY "agent_decisions_delete"
    ON public.rune_agent_decisions FOR DELETE
    USING (auth.uid() = user_id);
END $$;
