-- Workflow Modes V1 normalization
-- Canonical mode keys: lineal | branching | circular
-- Canonical writes: graph_json + workflow_mode + workflow_mode_config
-- Legacy columns are retained for one compatibility cycle.

BEGIN;

-- ---------------------------------------------------------------------------
-- rune_workflows
-- ---------------------------------------------------------------------------
ALTER TABLE public.rune_workflows
  ADD COLUMN IF NOT EXISTS graph_json jsonb,
  ADD COLUMN IF NOT EXISTS version_number integer,
  ADD COLUMN IF NOT EXISTS workflow_mode text DEFAULT 'branching',
  ADD COLUMN IF NOT EXISTS workflow_mode_config jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflows' AND column_name = 'graph'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflows
      SET graph_json = COALESCE(graph_json, graph)
      WHERE graph_json IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflows' AND column_name = 'version'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflows
      SET version_number = COALESCE(version_number, version)
      WHERE version_number IS NULL
    $sql$;
  END IF;
END $$;

UPDATE public.rune_workflows
SET graph_json = '{}'::jsonb
WHERE graph_json IS NULL;

UPDATE public.rune_workflows
SET version_number = 1
WHERE version_number IS NULL;

UPDATE public.rune_workflows
SET workflow_mode = 'branching'
WHERE workflow_mode IS NULL OR workflow_mode NOT IN ('lineal', 'branching', 'circular');

UPDATE public.rune_workflows
SET workflow_mode_config = '{}'::jsonb
WHERE workflow_mode_config IS NULL;

ALTER TABLE public.rune_workflows
  ALTER COLUMN graph_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN graph_json SET NOT NULL,
  ALTER COLUMN workflow_mode SET DEFAULT 'branching',
  ALTER COLUMN workflow_mode SET NOT NULL,
  ALTER COLUMN workflow_mode_config SET DEFAULT '{}'::jsonb,
  ALTER COLUMN workflow_mode_config SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rune_workflows_workflow_mode_check'
  ) THEN
    ALTER TABLE public.rune_workflows
      ADD CONSTRAINT rune_workflows_workflow_mode_check
      CHECK (workflow_mode IN ('lineal', 'branching', 'circular'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- rune_workflow_versions
-- ---------------------------------------------------------------------------
ALTER TABLE public.rune_workflow_versions
  ADD COLUMN IF NOT EXISTS version_number integer,
  ADD COLUMN IF NOT EXISTS definition_json jsonb,
  ADD COLUMN IF NOT EXISTS workflow_mode text DEFAULT 'branching',
  ADD COLUMN IF NOT EXISTS workflow_mode_config jsonb DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_versions' AND column_name = 'version'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_versions
      SET version_number = COALESCE(version_number, version)
      WHERE version_number IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_versions' AND column_name = 'graph'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_versions
      SET definition_json = COALESCE(
        definition_json,
        jsonb_build_object('graph', graph)
      )
      WHERE definition_json IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_versions' AND column_name = 'graph_json'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_versions
      SET definition_json = COALESCE(
        definition_json,
        jsonb_build_object('graph', graph_json)
      )
      WHERE definition_json IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_versions' AND column_name = 'code'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_versions
      SET definition_json = jsonb_set(
        COALESCE(definition_json, '{}'::jsonb),
        '{code}',
        to_jsonb(code),
        true
      )
      WHERE code IS NOT NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_versions' AND column_name = 'commit_message'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_versions
      SET definition_json = jsonb_set(
        COALESCE(definition_json, '{}'::jsonb),
        '{commit_message}',
        to_jsonb(commit_message),
        true
      )
      WHERE commit_message IS NOT NULL
    $sql$;
  END IF;
END $$;

UPDATE public.rune_workflow_versions
SET definition_json = '{}'::jsonb
WHERE definition_json IS NULL;

UPDATE public.rune_workflow_versions
SET version_number = 1
WHERE version_number IS NULL;

UPDATE public.rune_workflow_versions
SET workflow_mode = COALESCE(NULLIF(workflow_mode, ''), definition_json->>'workflow_mode', 'branching');

UPDATE public.rune_workflow_versions
SET workflow_mode = 'branching'
WHERE workflow_mode NOT IN ('lineal', 'branching', 'circular');

UPDATE public.rune_workflow_versions
SET workflow_mode_config = COALESCE(
  workflow_mode_config,
  definition_json->'workflow_mode_config',
  '{}'::jsonb
);

UPDATE public.rune_workflow_versions
SET definition_json = jsonb_set(
  jsonb_set(definition_json, '{workflow_mode}', to_jsonb(workflow_mode), true),
  '{workflow_mode_config}', COALESCE(workflow_mode_config, '{}'::jsonb), true
);

ALTER TABLE public.rune_workflow_versions
  ALTER COLUMN definition_json SET DEFAULT '{}'::jsonb,
  ALTER COLUMN definition_json SET NOT NULL,
  ALTER COLUMN workflow_mode SET DEFAULT 'branching',
  ALTER COLUMN workflow_mode SET NOT NULL,
  ALTER COLUMN workflow_mode_config SET DEFAULT '{}'::jsonb,
  ALTER COLUMN workflow_mode_config SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'rune_workflow_versions_workflow_mode_check'
  ) THEN
    ALTER TABLE public.rune_workflow_versions
      ADD CONSTRAINT rune_workflow_versions_workflow_mode_check
      CHECK (workflow_mode IN ('lineal', 'branching', 'circular'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rune_workflow_versions_mode
  ON public.rune_workflow_versions (workflow_mode);

-- ---------------------------------------------------------------------------
-- rune_workflow_runs (canonical run timestamps)
-- ---------------------------------------------------------------------------
ALTER TABLE public.rune_workflow_runs
  ADD COLUMN IF NOT EXISTS start_time timestamptz,
  ADD COLUMN IF NOT EXISTS end_time timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_runs' AND column_name = 'started_at'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_runs
      SET start_time = COALESCE(start_time, started_at)
      WHERE start_time IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_workflow_runs' AND column_name = 'finished_at'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_workflow_runs
      SET end_time = COALESCE(end_time, finished_at)
      WHERE end_time IS NULL
    $sql$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- rune_run_steps (canonical step columns)
-- ---------------------------------------------------------------------------
ALTER TABLE public.rune_run_steps
  ADD COLUMN IF NOT EXISTS node_id text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS input_json jsonb,
  ADD COLUMN IF NOT EXISTS output_json jsonb,
  ADD COLUMN IF NOT EXISTS error_json jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_run_steps' AND column_name = 'step_id'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_run_steps
      SET node_id = COALESCE(node_id, step_id)
      WHERE node_id IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_run_steps' AND column_name = 'start_time'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_run_steps
      SET started_at = COALESCE(started_at, start_time)
      WHERE started_at IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_run_steps' AND column_name = 'end_time'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_run_steps
      SET finished_at = COALESCE(finished_at, end_time)
      WHERE finished_at IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_run_steps' AND column_name = 'input'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_run_steps
      SET input_json = COALESCE(input_json, input)
      WHERE input_json IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_run_steps' AND column_name = 'output'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_run_steps
      SET output_json = COALESCE(output_json, output)
      WHERE output_json IS NULL
    $sql$;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rune_run_steps' AND column_name = 'error'
  ) THEN
    EXECUTE $sql$
      UPDATE public.rune_run_steps
      SET error_json = COALESCE(error_json, error)
      WHERE error_json IS NULL
    $sql$;
  END IF;
END $$;

UPDATE public.rune_run_steps
SET node_id = COALESCE(node_id, id::text)
WHERE node_id IS NULL;

ALTER TABLE public.rune_run_steps
  ALTER COLUMN node_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rune_run_steps_node_id
  ON public.rune_run_steps (node_id);

COMMIT;
