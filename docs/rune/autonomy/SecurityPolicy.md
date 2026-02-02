# Autonomy Security Policy (v1)

## Threat Model
- Prompt injection via external inputs
- Data exfiltration via logs
- Privilege escalation via service role
- Destructive actions without approval

## Rules
1. **High‑impact tools require approval** in CONFIRM mode.
2. **Autonomy OFF** ignores all triggers.
3. **Manual‑only** disables all background triggers.
4. **Service role access** must enforce user/workflow scoping in app layer.
5. **Audit trail** for every event, decision, plan, execution step.

## Approved Tools Matrix
- High impact: run_workflow, run_node, configure_node, workflow_publish, workflow_run_plan, workflow_delete, schedule_message, all MCP tools.
- Low impact: list_workflows, get_recent_runs, workflow_inspect, workflow_validate.

## Cron Security
- `/api/cron` accepts either:
  - `x-rune-cron-secret` header
  - `?secret=` query param
  - `x-vercel-cron: 1` header
