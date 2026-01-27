-- Create enum for scope types
DO $$ BEGIN
    CREATE TYPE agent_config_scope AS ENUM ('global', 'workflow', 'node', 'user_default');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create table for storing agent configurations
CREATE TABLE IF NOT EXISTS public.rune_agent_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Scope identification
    scope_type agent_config_scope NOT NULL DEFAULT 'user_default',
    workflow_id UUID REFERENCES public.rune_workflows(id) ON DELETE CASCADE,
    node_id TEXT, -- Optional, for node-specific overrides
    
    -- The actual configuration JSON
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints to ensure one config per scope
    CONSTRAINT uniq_user_scope UNIQUE NULLS NOT DISTINCT (user_id, scope_type, workflow_id, node_id)
);

-- Enable RLS
ALTER TABLE public.rune_agent_configs ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can view their own configs" ON public.rune_agent_configs;
    DROP POLICY IF EXISTS "Users can insert their own configs" ON public.rune_agent_configs;
    DROP POLICY IF EXISTS "Users can update their own configs" ON public.rune_agent_configs;
    DROP POLICY IF EXISTS "Users can delete their own configs" ON public.rune_agent_configs;
END $$;

CREATE POLICY "Users can view their own configs" 
    ON public.rune_agent_configs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own configs" 
    ON public.rune_agent_configs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configs" 
    ON public.rune_agent_configs FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own configs" 
    ON public.rune_agent_configs FOR DELETE 
    USING (auth.uid() = user_id);

-- Update timestamp function and trigger
CREATE OR REPLACE FUNCTION update_rune_agent_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_updated_at ON public.rune_agent_configs;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.rune_agent_configs
    FOR EACH ROW EXECUTE FUNCTION update_rune_agent_configs_updated_at();
