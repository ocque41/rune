# DB Delta (Shared Supabase)

## Existing Tables (Rune)
- `rune_workflows` (includes `product_id`)
- `rune_workflow_drafts`
- `rune_workflow_versions`
- `rune_runs`, `rune_run_steps`, `rune_workflow_runs`
- `rune_agent_events`, `rune_agent_jobs`, `rune_agent_decisions`
- `rune_autonomy_policies`
- `rune_autonomy_budget_usage` (rollup view or table)
- `rune_agent_usage_events`
- `rune_pending_messages`

## Notes
- Shared database uses `ecosystem_products` and `user_product_roles`.
- Ensure every Rune row ties to `product_id` or `workflow_id` and is RLS‑scoped.
- `rune_autonomy_policies` already stores per‑workflow and per‑user policies.

## Required Checks
- Confirm RLS policies enforce `auth.uid()` and product scope.
- Confirm `rune_agent_jobs` and `rune_agent_events` are user‑scoped.
- Confirm indexes for job leasing (status, leased_until, created_at).
