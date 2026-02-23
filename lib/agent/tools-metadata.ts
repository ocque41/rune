export const HIGH_IMPACT_TOOLS = [
    'run_workflow',
    'workflow_run_plan',
    'workflow_publish',
    'workflow_delete',
    'workflow_edit',
    'workflow_create',
    'configure_node',
    'mark_node_failed',
    'schedule_message',
    'run_node', // Running a node might have side effects
];

export type ToolCapability = 'implemented' | 'experimental' | 'disabled';

// Keep this list strict: only tools with real side effects/data access should be marked implemented.
const TOOL_CAPABILITIES: Record<string, ToolCapability> = {
    get_active_context: 'implemented',
    list_workflows: 'implemented',
    workflow_inspect: 'implemented',
    get_recent_runs: 'implemented',
    schedule_message: 'implemented',

    workflow_create: 'experimental',
    workflow_edit: 'experimental',
    workflow_validate: 'experimental',
    workflow_publish: 'experimental',
    workflow_delete: 'experimental',
    workflow_run_plan: 'experimental',
    run_workflow: 'experimental',
    run_node: 'experimental',
    configure_node: 'experimental',
    validate_node_config: 'experimental',
    mark_node_failed: 'experimental'
};

export function getToolCapability(toolName: string): ToolCapability {
    if (toolName.startsWith('mcp__') || toolName.startsWith('mcp:')) {
        return 'experimental';
    }

    return TOOL_CAPABILITIES[toolName] || 'disabled';
}

export function isToolImplemented(toolName: string): boolean {
    return getToolCapability(toolName) === 'implemented';
}

export function isHighImpactTool(toolName: string): boolean {
    if (toolName.startsWith('mcp__') || toolName.startsWith('mcp:')) return true; // Treat MCP as high impact by default
    // Ideally MCP tools should declare their impact. For safety, default to High.
    return HIGH_IMPACT_TOOLS.includes(toolName);
}
