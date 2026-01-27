-- Add Allowlist/Blocklist columns to policies
ALTER TABLE public.rune_autonomy_policies
ADD COLUMN IF NOT EXISTS tool_allowlist TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS tool_blocklist TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS domain_allowlist TEXT[] DEFAULT ARRAY[]::TEXT[];

COMMENT ON COLUMN public.rune_autonomy_policies.tool_allowlist IS 'Explicit list of allowed tools. If empty, all tools allowed (unless blocked). If set, ONLY these are allowed.';
COMMENT ON COLUMN public.rune_autonomy_policies.domain_allowlist IS 'Allowed domains for HTTP tools.';
