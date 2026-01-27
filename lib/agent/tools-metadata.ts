
export const HIGH_IMPACT_TOOLS = [
    'run_workflow',
    'configure_node',
    'mark_node_failed',
    'schedule_message',
    'run_node', // Running a node might have side effects
];

export function isHighImpactTool(toolName: string): boolean {
    if (toolName.startsWith('mcp__')) return true; // Assume all MCP tools are high impact for now or check definitions
    // Ideally MCP tools should declare their impact. For safety, default to High.
    return HIGH_IMPACT_TOOLS.includes(toolName);
}
