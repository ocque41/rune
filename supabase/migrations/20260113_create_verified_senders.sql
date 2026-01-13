-- Create verified_senders table for email sender verification
-- This table stores verified email addresses and SMTP configurations for workflow email nodes

CREATE TABLE public.verified_senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'connected')),
    verification_code TEXT,
    smtp_config JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(email, owner_id)
);

-- Enable RLS
ALTER TABLE public.verified_senders ENABLE ROW LEVEL SECURITY;

-- Users can only see their own senders
CREATE POLICY "Users can view own senders" ON public.verified_senders
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own senders" ON public.verified_senders
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own senders" ON public.verified_senders
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own senders" ON public.verified_senders
    FOR DELETE USING (auth.uid() = owner_id);

-- Create index for faster lookups by owner
CREATE INDEX idx_verified_senders_owner ON public.verified_senders(owner_id);
