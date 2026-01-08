-- Migration: Add versioning to workflow runs
-- Purpose: Link each run to a specific immutable workflow version

-- ============================================================================
-- Table Alteration: rune_workflow_runs
-- ============================================================================

-- Add reference to version
alter table rune_workflow_runs 
add column if not exists workflow_version_id uuid references rune_workflow_versions(id);

-- Add index
create index if not exists idx_rune_workflow_runs_version_id 
on rune_workflow_runs(workflow_version_id);
