-- Optimizing Rune Dashboard performance
-- Add composite indexes for user-scoped filtered sorts

CREATE INDEX IF NOT EXISTS idx_rune_workflows_user_updated 
ON public.rune_workflows (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_rune_runs_user_created 
ON public.rune_runs (user_id, created_at DESC);

-- Ensure filtered index for active/recent chats if generic list needed
-- (Already exists for workflow_id specific, adding generic)
CREATE INDEX IF NOT EXISTS idx_rune_chats_user_updated
ON public.rune_chats (user_id, updated_at DESC);
