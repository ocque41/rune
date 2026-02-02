# Repo Reality Map (Rune Autonomy)

## Control Plane (UI)
- **Playground Auto toggle (local state)**
  - `components/playground/components/playground.tsx`
- **Autonomy policy UI**
  - `components/autonomy/policy-settings.tsx`
- **Autonomy dashboard**
  - `components/autonomy/autonomy-dashboard.tsx`

## Data Plane (Supabase)
Key tables (public):
- `rune_workflows`, `rune_workflow_drafts`, `rune_workflow_versions`
- `rune_runs`, `rune_run_steps`, `rune_workflow_runs`
- `rune_agent_events`, `rune_agent_jobs`, `rune_agent_decisions`
- `rune_autonomy_policies`, `rune_autonomy_budget_usage`
- `rune_agent_usage_events`
- `rune_pending_messages`
- `rune_agent_sessions`, `rune_chats`, `rune_chat_messages`

## Execution Plane
- **Cron entrypoint**: `app/api/cron/route.ts`
  - leases jobs via RPC `lease_jobs`
- **Autonomy trigger**: `app/api/rune/autonomy/trigger/route.ts`
- **Autonomy engine**: `lib/autonomy/service.ts` (triage + planning + execution)
- **Execution**: `lib/autonomy/execution.ts`
- **Workflow runner**: `lib/workflow-engine.ts`

## Tooling Surface
- Tool definitions: `lib/agent-tools.ts`
- Tool execution: `lib/agent/executor.ts`

## Worker / Scheduler
- `vercel.json` cron schedule → `/api/cron`
- `scripts/autonomy-worker.js` (always‑on device fallback)
