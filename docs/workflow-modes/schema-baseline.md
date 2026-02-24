# Workflow Modes Schema Baseline

Date: February 24, 2026  
Environment: `/Users/miguel/Documents/cumulus/rune`

## MCP Status
- `cumulus-supabase` MCP is currently blocked in this Codex session.
- Error: required env var `sbp_94437c1d24086fbe403071badb6cf55fe2c11f23` is not available to the running MCP runtime.
- Result: live production schema introspection could not be completed inside this session.

## Baseline Source Used
- Repository migrations in `/Users/miguel/Documents/cumulus/rune/supabase/migrations`.
- Current data-layer usage in:
  - `/Users/miguel/Documents/cumulus/rune/lib/workflow-store.ts`
  - `/Users/miguel/Documents/cumulus/rune/lib/run-store.ts`
  - `/Users/miguel/Documents/cumulus/rune/app/api/rune/workflows/*`

## Inferred Live/Drifted Tables

### `public.rune_workflows`
- Canonical target columns:
  - `id`
  - `user_id`
  - `name`
  - `description`
  - `graph_json` (`jsonb`, not null, default `{}`)
  - `code`
  - `version_number`
  - `workflow_mode` (`text`, check: `lineal|branching|circular`, default `branching`)
  - `workflow_mode_config` (`jsonb`, not null, default `{}`)
  - `created_at`, `updated_at`
- Legacy compatibility columns observed in migrations/code:
  - `graph`
  - `version`

### `public.rune_workflow_versions`
- Canonical target columns:
  - `id`
  - `workflow_id`
  - `user_id`
  - `version_number`
  - `definition_json` (`jsonb`, not null)
  - `workflow_mode`
  - `workflow_mode_config`
  - `created_at`
- Legacy compatibility columns observed in migrations/code:
  - `version`
  - `graph` and/or `graph_json`
  - `code`
  - `commit_message`
  - `deployed_at`

### `public.rune_workflow_runs`
- Canonical run columns used by app:
  - `id`, `user_id`
  - `workflow_id`, `workflow_version_id`
  - `workflow_name`
  - `status`
  - `start_time`, `end_time`, `duration`
  - `args`, `result`, `error`, `logs`, `waiting_for`
  - `created_at`
- Legacy compatibility expected:
  - `started_at`, `finished_at`

### `public.rune_run_steps`
- Canonical step columns:
  - `id`, `run_id`, `user_id`
  - `node_id`
  - `status`
  - `started_at`, `finished_at`
  - `input_json`, `output_json`, `error_json`
  - `attempts`
  - `created_at`
- Legacy compatibility columns expected:
  - `step_id`, `step_label`, `step_type`
  - `start_time`, `end_time`, `duration_ms`
  - `input`, `output`, `error`

### `public.rune_workflow_drafts`
- Observed usage:
  - `id`, `workflow_id`, `user_id`
  - `draft_json`
  - `updated_at`

## Drift List vs Repo Intent
- `rune_workflows` uses mixed legacy (`graph`, `version`) and canonical (`graph_json`) forms.
- `rune_workflow_versions` may have split legacy columns (`graph`, `code`, `version`) and newer canonical (`definition_json`, `version_number`).
- `rune_run_steps` may contain both old (`step_id`, `start_time`, `input`) and canonical (`node_id`, `started_at`, `input_json`) representations.
- `workflow_mode` and `workflow_mode_config` are not guaranteed on both workflows and version snapshots yet.

## Applied Reconciliation Artifact
- New migration added:
  - `/Users/miguel/Documents/cumulus/rune/supabase/migrations/20260224091000_workflow_modes_v1.sql`
- Scope:
  - Adds canonical mode columns/checks.
  - Backfills legacy graph/version fields into canonical columns.
  - Normalizes run/step canonical columns while preserving legacy columns for one compatibility cycle.

## Pending After MCP Recovery
- Re-run live table/constraint/index/policy snapshot from `cumulus-supabase`.
- Validate migration against production clone/branch.
- Update this document with exact live diff once MCP auth is restored in-session.
