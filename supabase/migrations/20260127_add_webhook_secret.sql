-- Add webhook_secret to rune_workflows
ALTER TABLE public.rune_workflows 
ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT encode(gen_random_bytes(32), 'hex');

COMMENT ON COLUMN public.rune_workflows.webhook_secret IS 
    'Secret key for validating external webhooks via HMAC-SHA256';

-- Add index for lookup if we fetch by something else, but usually we fetch by ID
