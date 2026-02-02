# Rune Autonomy Framework Spec v1

## Objective
Deliver a full autonomy orchestration framework with deterministic workflow execution, persistent autonomy controls, and 24/7 processing via Vercel Cron.

## Architecture
### Control Plane
- Flow Builder + Playground
- Autonomy policy editor
- Approval UI

### Data Plane
- Supabase shared database
- Rune tables scoped by `product_id` and `workflow_id`
- Autonomy tables for events/jobs/decisions/budget

### Execution Plane
- `/api/cron` worker loop
- Job leasing via `lease_jobs` RPC
- Resumable execution batches

## Always‑On Runtime
- Vercel Cron → `/api/cron` every minute (vercel.json)
- Always‑on device can run `autonomy:worker` as fallback

## Tooling
- Full workflow authoring + runPlan tool set
- Auditable logs for tools, decisions, and runs

## Policies
- OFF / CONFIRM / AUTONOMOUS modes
- Trigger filters (webhook, schedule, run completion)
- Budget enforcement (actions + tokens)

## Success Criteria
1) Workflow recommendation + build + approval + run
2) Partial DAG execution with deterministic RunPlan
3) Autonomy persists per workflow policy
4) Jobs run autonomously via cron
5) All actions are auditable
