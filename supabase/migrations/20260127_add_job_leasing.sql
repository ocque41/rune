-- Add leasing columns
ALTER TABLE public.rune_agent_jobs
ADD COLUMN IF NOT EXISTS leased_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- Index for polling
CREATE INDEX idx_rune_agent_jobs_poll 
ON public.rune_agent_jobs (status, created_at)
WHERE status IN ('pending', 'running');

CREATE INDEX idx_rune_agent_jobs_lease 
ON public.rune_agent_jobs (leased_until)
WHERE leased_until IS NOT NULL;
