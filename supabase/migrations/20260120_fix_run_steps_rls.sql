-- Migration: Fix RLS for rune_run_steps
-- Date: 2026-01-20
-- Purpose: Fix 'new row violates row-level security policy' errors during step insertion

-- 1. Reset policies for rune_run_steps
DROP POLICY IF EXISTS "Users can view own run steps" ON rune_run_steps;
DROP POLICY IF EXISTS "Users can insert own run steps" ON rune_run_steps;
DROP POLICY IF EXISTS "Users can update own run steps" ON rune_run_steps;

-- 2. Re-create detailed policies
-- Ensure users can SELECT their own steps
CREATE POLICY "Users can view own run steps" ON rune_run_steps
    FOR SELECT
    USING (auth.uid() = user_id);

-- Ensure users can INSERT their own steps
CREATE POLICY "Users can insert own run steps" ON rune_run_steps
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Ensure users can UPDATE their own steps (e.g. marking status)
CREATE POLICY "Users can update own run steps" ON rune_run_steps
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 3. Explicitly Enable RLS
ALTER TABLE rune_run_steps ENABLE ROW LEVEL SECURITY;
