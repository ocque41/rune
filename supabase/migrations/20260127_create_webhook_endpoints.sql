-- rune_webhook_endpoints table
CREATE TABLE IF NOT EXISTS public.rune_webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.rune_workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    secret_hash TEXT NOT NULL, -- SHA256 of the user-facing secret
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Index for lookup
CREATE INDEX idx_rune_webhook_endpoints_user ON public.rune_webhook_endpoints(user_id);
CREATE INDEX idx_rune_webhook_endpoints_workflow ON public.rune_webhook_endpoints(workflow_id);

-- RLS
ALTER TABLE public.rune_webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY rune_webhook_endpoints_all ON public.rune_webhook_endpoints
    FOR ALL USING (auth.uid() = user_id);
