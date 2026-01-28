-- Migration: inspect_indexes
-- Description: Add indexes for performant querying of usage logs by user and time.

-- Index for LLM Calls (Paginated by time for a user)
CREATE INDEX IF NOT EXISTS idx_rune_llm_calls_user_created 
ON public.rune_llm_calls (user_id, created_at DESC);

-- Index for Tool Invocations (Paginated by time for a user)
CREATE INDEX IF NOT EXISTS idx_rune_tool_invocations_user_created 
ON public.rune_tool_invocations (user_id, created_at DESC);

-- Ensure RLS is enabled (Idempotent)
ALTER TABLE public.rune_llm_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rune_tool_invocations ENABLE ROW LEVEL SECURITY;

-- Policies (Idempotent creation using DO block to avoid errors if they exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rune_llm_calls' AND policyname = 'Users can view own usage'
    ) THEN
        CREATE POLICY "Users can view own usage" ON public.rune_llm_calls
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'rune_tool_invocations' AND policyname = 'Users can view own tool usage'
    ) THEN
        CREATE POLICY "Users can view own tool usage" ON public.rune_tool_invocations
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;
