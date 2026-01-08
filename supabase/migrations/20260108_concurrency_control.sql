-- Migration: Concurrency Control
-- 1. Optimistic Locking for Workflows
ALTER TABLE rune_workflows
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 2. Optimization: Index on run_id for steps
CREATE INDEX IF NOT EXISTS idx_rune_run_steps_run_id ON rune_run_steps(run_id);

-- 3. RPC for Atomic Step Recording (Transaction)
-- This function updates the run status, appends a log, and records the step execution atomically.
CREATE OR REPLACE FUNCTION record_run_progress(
  p_run_id UUID,
  p_step_data JSONB,    -- Data for rune_run_steps
  p_log_entry JSONB,    -- Data for rune_workflow_runs.logs (optional)
  p_run_updates JSONB   -- Status updates for rune_workflow_runs (optional)
) RETURNS VOID AS $$
BEGIN
  -- 1. Insert/Update into rune_run_steps
  IF p_step_data IS NOT NULL THEN
    INSERT INTO rune_run_steps (
      run_id, 
      step_id, 
      step_label, 
      status, 
      start_time, 
      end_time, 
      duration_ms, 
      output, 
      error,
      updated_at
    ) VALUES (
      p_run_id, 
      (p_step_data->>'stepId'),
      (p_step_data->>'stepLabel'),
      (p_step_data->>'status'),
      (p_step_data->>'startTime')::timestamptz,
      (p_step_data->>'endTime')::timestamptz,
      (p_step_data->>'durationMs')::int,
      (p_step_data->'result'), -- Map result to output
      (p_step_data->'error'), -- Keep as jsonb or cast? Error in table is jsonb? Check migration.
      NOW()
    )
    ON CONFLICT (run_id, step_id) DO UPDATE SET
      status = EXCLUDED.status,
      end_time = EXCLUDED.end_time,
      duration_ms = EXCLUDED.duration_ms,
      output = EXCLUDED.output,
      error = EXCLUDED.error,
      updated_at = NOW();
  END IF;

  -- 2. Update rune_workflow_runs
  UPDATE rune_workflow_runs
  SET 
    -- Atomic Log Append
    logs = CASE 
        WHEN p_log_entry IS NOT NULL THEN 
            COALESCE(logs, '[]'::jsonb) || p_log_entry 
        ELSE logs 
    END,
    
    -- Status Updates (only if provided)
    status = COALESCE(p_run_updates->>'status', status),
    result = COALESCE((p_run_updates->'result'), result),
    error = COALESCE(p_run_updates->>'error', error),
    end_time = CASE 
        WHEN p_run_updates->>'endTime' IS NOT NULL THEN (p_run_updates->>'endTime')::timestamptz 
        ELSE end_time 
    END,
    duration = CASE 
        WHEN p_run_updates->>'duration' IS NOT NULL THEN (p_run_updates->>'duration')::int 
        ELSE duration 
    END
    
  WHERE id = p_run_id;
  
END;
$$ LANGUAGE plpgsql;
