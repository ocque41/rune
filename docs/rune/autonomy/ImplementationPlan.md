# Rune Autonomy Implementation Plan (Always-On Worker)

## Goal
Deliver full autonomy with deterministic subgraph execution, auditable logs, and 24/7 processing using a free always-on device.

## Success Criteria (from spec)
1. User request can:
   - (a) trigger workflow recommendation,
   - (b) build workflow with approval,
   - (c) run full or partial DAG deterministically,
   - (d) run autonomously when auto_enabled is true,
   - (e) produce auditable logs for every run.

## Execution Model
- **Vercel Cron** hits `/api/cron` every minute (vercel.json).
- **Always-on device** can run `autonomy:worker` as a fallback or for local/dev.
- `/api/cron` leases jobs via `lease_jobs` RPC and executes short batches.
- All work is chunked and resumable to survive timeouts.

## Phase Gates
### Gate 1 — Authoring Toolchain
- Tools allow create → edit → validate → publish.
- Agent can build a workflow with tool-only operations.

### Gate 2 — Deterministic RunPlan
- Tool `workflow_run_plan` compiles a deterministic subgraph.
- Dependencies are closed; ordering is stable.

### Gate 3 — Autonomy Persistence
- Auto toggle persists per workflow (policy-based).
- Toggle controls policy mode (OFF/AUTONOMOUS).

### Gate 4 — Always-On Worker
- `autonomy:worker` hits `/api/cron` continuously.
- Worker uses `RUNE_CRON_SECRET` if configured.

### Gate 5 — Auditing + Budget
- Autonomy events/jobs/usage are logged.
- Budget enforcement is applied per policy.

## Operational Notes
- Set env vars on the always-on device:
  - `RUNE_CRON_URL` (e.g., https://rune.app/api/cron)
  - `RUNE_CRON_SECRET` (if enabled)
  - `RUNE_CRON_INTERVAL_MS` (default 60000)

## Next Actions
- Wire UI Auto toggle to autonomy policy (workflow-scoped).
- Ensure `workflow_run_plan` uses latest published graph.
- Add/verify tool logging for new workflow tools.
- Validate RLS scoping for Rune tables in shared DB.
