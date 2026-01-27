import {
    getActiveContext,
    listWorkflows,
    getRecentRuns,
    runWorkflow,
    runNode,
    configureNode,
    scheduleMessage,
    validateNodeConfig,
    markNodeFailed
} from '@/lib/agent-tools';

export async function executeTool(supabase: any, userId: string, toolName: string, args: any) {
    console.log(`[ToolExec] Executing ${toolName} for ${userId}`, args);
    try {
        switch (toolName) {
            case 'get_active_context':
                return await getActiveContext(supabase, userId);
            case 'list_workflows':
                return await listWorkflows(supabase, userId, args.limit);
            case 'get_recent_runs':
                return await getRecentRuns(supabase, userId, args.workflowId, args.limit);
            case 'run_workflow':
                return await runWorkflow(supabase, userId, args.payload);
            case 'run_node':
                return await runNode(supabase, userId, args.nodeIdentifier, args.input);
            case 'configure_node':
                return await configureNode(supabase, userId, args.nodeIdentifier, args.config);
            case 'schedule_message':
                return await scheduleMessage(supabase, userId, {
                    message: args.message,
                    delayMinutes: args.delayMinutes,
                    priority: args.priority,
                    chatId: args.chatId,
                    workflowId: args.workflowId
                });
            case 'validate_node_config':
                return await validateNodeConfig(args);
            case 'mark_node_failed':
                return await markNodeFailed(supabase, userId, args.nodeIdentifier, args.reason);
            default:
                // Check if it's an MCP tool (prefixed with mcp__)
                if (toolName.startsWith('mcp__')) {
                    // return await executeMcpTool(supabase, userId, toolName, args);
                    return { error: `MCP execution not yet migrated to shared executor: ${toolName}` };
                }
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[ToolExec] Error in ${toolName}:`, e);
        return { error: e.message };
    }
}
