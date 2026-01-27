-- dedicated table for short-lived approval tokens
CREATE TABLE IF NOT EXISTS public.rune_auth_tokens (
    token TEXT PRIMARY KEY DEFAULT encode(gen_random_bytes(32), 'hex'),
    job_id UUID NOT NULL REFERENCES public.rune_agent_jobs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'), -- Link valid for 7 days
    used_at TIMESTAMPTZ
);

-- Index for lookup
CREATE INDEX idx_rune_auth_tokens_token ON public.rune_auth_tokens(token);

-- RLS
ALTER TABLE public.rune_auth_tokens ENABLE ROW LEVEL SECURITY;

-- Admins/System can create tokens. 
-- Public (anonymous) needs to READ token to validate it? 
-- Actually, the approval route runs server-side. It can use Service Role to validate.
-- So we restrict RLS to owners.

CREATE POLICY rune_auth_tokens_select ON public.rune_auth_tokens
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.rune_agent_jobs j 
            WHERE j.id = rune_auth_tokens.job_id 
            AND j.user_id = auth.uid()
        )
    );
