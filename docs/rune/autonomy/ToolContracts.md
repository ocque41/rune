# Tool Contracts (v1)

## Workflow Tools
- `workflow_create({ name, description? })`
  - Creates workflow + draft, sets active session.
- `workflow_inspect({ workflowId? })`
  - Returns workflow, draft, latest version.
- `workflow_edit({ workflowId?, ops[] })`
  - Patch ops: add_node, update_node, remove_node, add_edge, remove_edge, set_graph.
- `workflow_validate({ workflowId? })`
  - Validates draft graph (errors/warnings).
- `workflow_publish({ workflowId?, commitMessage? })`
  - Publishes immutable version from draft.
- `workflow_delete({ workflowId? })`
  - Soft archive only.
- `workflow_run_plan({ workflowId?, nodeIds?, startNodes?, endNodes?, includeDependencies?, inputOverrides? })`
  - Deterministic subgraph execution.

## Existing Tools
- `get_active_context`
- `list_workflows`
- `get_recent_runs`
- `run_workflow`
- `run_node`
- `configure_node`
- `validate_node_config`
- `mark_node_failed`
- `schedule_message`
- `get_run_details`

## Logging Requirements
- All tool calls logged via `rune_agent_usage_events`.
- High‑impact tools require approval when policy mode is CONFIRM.

## RunPlan Rules
- Stable ordering: nodes/edges sorted by id.
- Dependencies closed if `includeDependencies` is true.
- Inputs can be overridden per node via `inputOverrides`.
