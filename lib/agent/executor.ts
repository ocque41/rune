import {
    getActiveContext,
    listWorkflows,
    getRecentRuns,
    runWorkflow,
    runNode,
    configureNode,
    scheduleMessage,
    validateNodeConfig,
    markNodeFailed,
    createWorkflow,
    inspectWorkflow,
    editWorkflow,
    validateWorkflow,
    publishWorkflow,
    deleteWorkflow,
    runWorkflowPlan
} from '@/lib/agent-tools';

import { logUsageEvent } from '@/lib/usage/log';
import { isHighImpactTool, isToolImplemented } from './tools-metadata';
import { redactSecrets } from '@/lib/security/secrets-policy';

export interface ToolExecutionContext {
    jobId?: string;
    stepId?: string;
    chatId?: string;
    workflowId?: string;
}

export async function executeTool(supabase: any, userId: string, toolName: string, args: any, context?: ToolExecutionContext) {
    console.log(`[ToolExec] Executing ${toolName} for ${userId}`, redactSecrets(args));
    const startTime = Date.now();
    let status: 'success' | 'error' = 'success';

    try {
        if (toolName.startsWith('mcp:')) {
            const [, serverName, ...toolParts] = toolName.split(':');
            toolName = `mcp__${serverName || 'unknown'}__${toolParts.join(':')}`;
        }

        if (!toolName.startsWith('mcp__') && !isToolImplemented(toolName)) {
            status = 'error';
            return { error: `Tool '${toolName}' is not enabled for production execution.` };
        }

        let result;
        switch (toolName) {
            case 'get_active_context':
                result = await getActiveContext(supabase, userId);
                break;
            case 'list_workflows':
                result = await listWorkflows(supabase, userId, args.limit);
                break;
            case 'workflow_inspect':
                result = await inspectWorkflow(supabase, userId, args.workflowId);
                break;
            case 'workflow_create':
                result = await createWorkflow(supabase, userId, { name: args.name, description: args.description });
                break;
            case 'workflow_edit':
                result = await editWorkflow(supabase, userId, args.workflowId, args.ops || []);
                break;
            case 'workflow_validate':
                result = await validateWorkflow(supabase, userId, args.workflowId);
                break;
            case 'workflow_publish':
                result = await publishWorkflow(supabase, userId, args.workflowId, args.commitMessage);
                break;
            case 'workflow_delete':
                result = await deleteWorkflow(supabase, userId, args.workflowId);
                break;
            case 'workflow_run_plan':
                result = await runWorkflowPlan(supabase, userId, {
                    workflowId: args.workflowId,
                    nodeIds: args.nodeIds,
                    startNodes: args.startNodes,
                    endNodes: args.endNodes,
                    includeDependencies: args.includeDependencies,
                    inputOverrides: args.inputOverrides
                });
                break;
            case 'get_recent_runs':
                result = await getRecentRuns(supabase, userId, args.workflowId, args.limit);
                break;
            case 'run_workflow':
                result = await runWorkflow(supabase, userId, args.payload);
                break;
            case 'run_node':
                result = await runNode(supabase, userId, args.nodeIdentifier, args.input);
                break;
            case 'configure_node':
                result = await configureNode(supabase, userId, args.nodeIdentifier, args.config);
                break;
            case 'schedule_message':
                result = await scheduleMessage(supabase, userId, {
                    message: args.message,
                    delayMinutes: args.delayMinutes,
                    priority: args.priority,
                    chatId: args.chatId,
                    workflowId: args.workflowId
                });
                break;
            case 'validate_node_config':
                result = await validateNodeConfig(args);
                break;
            case 'mark_node_failed':
                result = await markNodeFailed(supabase, userId, args.nodeIdentifier, args.reason);
                break;
            default:
                // Check if it's an MCP tool (prefixed with mcp__)
                if (toolName.startsWith('mcp__')) {
                    // return await executeMcpTool(supabase, userId, toolName, args);
                    result = { error: `MCP execution not yet migrated to shared executor: ${toolName}` };
                    status = 'error';
                } else {
                    result = { error: `Unknown tool: ${toolName}` };
                    status = 'error';
                }
        }
        return result;

    } catch (e: any) {
        console.error(`[ToolExec] Error in ${toolName}:`, redactSecrets(e?.message || e));
        status = 'error';
        return { error: redactSecrets(e.message) };
    } finally {
        const latency = Date.now() - startTime;
        // Fire and forget logging
        logUsageEvent({
            userId,
            source: 'tool_executor',
            model: 'tool:' + toolName,

            // Context injection
            jobId: context?.jobId,
            stepId: context?.stepId,
            chatId: context?.chatId,
            workflowId: context?.workflowId,

            toolName,

            isHighImpactTool: isHighImpactTool(toolName),
            status,
            latencyMs: latency,
            metadata: { tool_args: redactSecrets(args) }
        });
    }
}
