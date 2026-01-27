-- Drop previous table if exists (dev only, or use ALTER)
DROP TABLE IF EXISTS public.rune_auth_tokens;

-- rune_approval_tokens (New Schema)
CREATE TABLE IF NOT EXISTS public.rune_approval_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES public.rune_agent_jobs(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL, -- SHA-256
    action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    used_at TIMESTAMPTZ
);

CREATE INDEX idx_rune_approval_tokens_hash ON public.rune_approval_tokens(token_hash);

ALTER TABLE public.rune_approval_tokens ENABLE ROW LEVEL SECURITY;
-- Internal use mostly, but can add policies for admin inspection
CREATE POLICY rune_approval_tokens_select ON public.rune_approval_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rune_agent_jobs j 
            WHERE j.id = rune_approval_tokens.job_id 
            AND j.user_id = auth.uid()
        )
    );
