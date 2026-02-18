// /Users/miguel/Documents/cumulus/rune/lib/agent-tools.ts
// This file has been reconstructed based on inferences from route.ts
// and will serve as the central definition and execution point for agent tools.

import { SupabaseClient } from '@supabase/supabase-js'; // Assuming SupabaseClient is available
import { createClient } from '@/lib/supabase/server'; // Needed for MCP tools

// --- INTERFACES AND TYPES ---
export interface ToolFunction {
    name: string;
    description: string;
    parameters: object; // JSON Schema
}

export interface ToolDefinition {
    type: 'function';
    function: ToolFunction;
}

// --- TOOL HANDLERS ---
// These functions correspond to the tools defined in TOOLS_DEFINITION.
// They accept supabase, userId, and args, and return a Promise resolving to tool output.

export async function getActiveContext(supabase: SupabaseClient, userId: string): Promise<any> {
    console.log("[Tool Stub] getActiveContext called for userId:", userId);
    // In a real scenario, this would fetch the active context from the database or other services.
    return { status: "success", message: "Active context retrieved (stub)." };
}

export async function listWorkflows(supabase: SupabaseClient, userId: string, limit?: number): Promise<any> {
    console.log(`[Tool Stub] listWorkflows called for userId: ${userId} with limit: ${limit}`);
    return { status: "success", workflows: ["MyFirstWorkflow", "ProjectAlpha"] };
}

export async function inspectWorkflow(supabase: SupabaseClient, userId: string, workflowId: string): Promise<any> {
    console.log(`[Tool Stub] inspectWorkflow called for userId: ${userId}, workflowId: ${workflowId}`);
    return { status: "success", workflow: { id: workflowId, name: "Sample Workflow", nodes: 2, edges: 1 } };
}

export async function createWorkflow(supabase: SupabaseClient, userId: string, payload: { name: string, description?: string }): Promise<any> {
    console.log(`[Tool Stub] createWorkflow called for userId: ${userId}, name: ${payload.name}`);
    return { status: "success", newWorkflowId: "wf_new_123", name: payload.name };
}

export async function editWorkflow(supabase: SupabaseClient, userId: string, workflowId: string, ops: any[]): Promise<any> {
    console.log(`[Tool Stub] editWorkflow called for userId: ${userId}, workflowId: ${workflowId}, operations:`, ops);
    return { status: "success", message: `Workflow ${workflowId} edited.` };
}

export async function validateWorkflow(supabase: SupabaseClient, userId: string, workflowId: string): Promise<any> {
    console.log(`[Tool Stub] validateWorkflow called for userId: ${userId}, workflowId: ${workflowId}`);
    return { status: "success", isValid: true, message: `Workflow ${workflowId} is valid.` };
}

export async function publishWorkflow(supabase: SupabaseClient, userId: string, workflowId: string, commitMessage?: string): Promise<any> {
    console.log(`[Tool Stub] publishWorkflow called for userId: ${userId}, workflowId: ${workflowId}, commit: ${commitMessage}`);
    return { status: "success", message: `Workflow ${workflowId} published.` };
}

export async function deleteWorkflow(supabase: SupabaseClient, userId: string, workflowId: string): Promise<any> {
    console.log(`[Tool Stub] deleteWorkflow called for userId: ${userId}, workflowId: ${workflowId}`);
    return { status: "success", message: `Workflow ${workflowId} deleted.` };
}

export async function runWorkflowPlan(supabase: SupabaseClient, userId: string, payload: any): Promise<any> {
    console.log(`[Tool Stub] runWorkflowPlan called for userId: ${userId}, payload:`, payload);
    return { status: "success", runId: "run_plan_456" };
}

export async function getRecentRuns(supabase: SupabaseClient, userId: string, workflowId?: string, limit?: number): Promise<any> {
    console.log(`[Tool Stub] getRecentRuns called for userId: ${userId}, workflowId: ${workflowId}, limit: ${limit}`);
    return { status: "success", runs: [{ id: "run_789", status: "completed" }] };
}

export async function runWorkflow(supabase: SupabaseClient, userId: string, payload: any): Promise<any> {
    console.log(`[Tool Stub] runWorkflow called for userId: ${userId}, payload:`, payload);
    return { status: "success", runId: "run_abc" };
}

export async function runNode(supabase: SupabaseClient, userId: string, nodeIdentifier: string, input: any): Promise<any> {
    console.log(`[Tool Stub] runNode called for userId: ${userId}, node: ${nodeIdentifier}, input:`, input);
    return { status: "success", nodeId: nodeIdentifier, output: "Node executed successfully." };
}

export async function configureNode(supabase: SupabaseClient, userId: string, nodeIdentifier: string, config: any): Promise<any> {
    console.log(`[Tool Stub] configureNode called for userId: ${userId}, node: ${nodeIdentifier}, config:`, config);
    return { status: "success", nodeId: nodeIdentifier, message: "Node configured." };
}

export async function scheduleMessage(supabase: SupabaseClient, userId: string, payload: any): Promise<any> {
    console.log(`[Tool Stub] scheduleMessage called for userId: ${userId}, payload:`, payload);
    return { status: "success", message: "Message scheduled." };
}

export async function validateNodeConfig(args: any): Promise<any> {
    console.log(`[Tool Stub] validateNodeConfig called with args:`, args);
    return { status: "success", isValid: true, message: "Node config is valid (stub)." };
}

export async function markNodeFailed(supabase: SupabaseClient, userId: string, nodeIdentifier: string, reason: string): Promise<any> {
    console.log(`[Tool Stub] markNodeFailed called for userId: ${userId}, node: ${nodeIdentifier}, reason: ${reason}`);
    return { status: "success", nodeId: nodeIdentifier, message: "Node marked as failed." };
}

// --- TOOLS_DEFINITION (for LLM Function Calling) ---
// These are the declarations the LLM sees.

export const TOOLS_DEFINITION: ToolDefinition[] = [
    {
        type: 'function',
        function: {
            name: 'get_active_context',
            description: 'Retrieves the current active context for the user and workflow.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_workflows',
            description: 'Lists all available workflows for the current user.',
            parameters: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: 'Optional limit for the number of workflows to return.',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_inspect',
            description: 'Inspects a specific workflow to get its details, including nodes and edges.',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'The ID of the workflow to inspect.',
                    },
                },
                required: ['workflowId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_create',
            description: 'Creates a new workflow.',
            parameters: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string',
                        description: 'The name of the new workflow.',
                    },
                    description: {
                        type: 'string',
                        description: 'Optional description for the new workflow.',
                    },
                },
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_edit',
            description: 'Edits an existing workflow by applying a series of operations (add node, remove edge, update config, etc.).',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'The ID of the workflow to edit.',
                    },
                    ops: {
                        type: 'array',
                        items: {
                            type: 'object', // More detailed schema can be added here if needed
                        },
                        description: 'An array of operations to apply to the workflow (e.g., add_node, remove_node, add_edge, remove_edge, update_node_config).',
                    },
                },
                required: ['workflowId', 'ops'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_validate',
            description: 'Validates a workflow to ensure it is correctly configured and can be run.',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'The ID of the workflow to validate.',
                    },
                },
                required: ['workflowId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_publish',
            description: 'Publishes a workflow, making it available for execution.',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'The ID of the workflow to publish.',
                    },
                    commitMessage: {
                        type: 'string',
                        description: 'Optional commit message for the publication.',
                    },
                },
                required: ['workflowId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_delete',
            description: 'Deletes a workflow.',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'The ID of the workflow to delete.',
                    },
                },
                required: ['workflowId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'workflow_run_plan',
            description: 'Executes a plan to run a workflow or a subset of its nodes.',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'The ID of the workflow to run.',
                    },
                    nodeIds: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional: Specific node IDs to run.',
                    },
                    startNodes: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional: Start execution from these nodes.',
                    },
                    endNodes: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Optional: End execution at these nodes.',
                    },
                    includeDependencies: {
                        type: 'boolean',
                        description: 'Optional: Whether to include dependencies of specified nodes. Defaults to false.',
                    },
                    inputOverrides: {
                        type: 'object',
                        description: 'Optional: Input values to override at the workflow level or for specific nodes.',
                    },
                },
                required: ['workflowId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_recent_runs',
            description: 'Retrieves recent runs for a specific workflow or all workflows.',
            parameters: {
                type: 'object',
                properties: {
                    workflowId: {
                        type: 'string',
                        description: 'Optional: The ID of the workflow to get runs for.',
                    },
                    limit: {
                        type: 'number',
                        description: 'Optional: Limit the number of runs to return.',
                    },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'run_workflow',
            description: 'Triggers a full execution of a workflow with a given payload.',
            parameters: {
                type: 'object',
                properties: {
                    payload: {
                        type: 'object',
                        description: 'The input payload for the workflow run.',
                    },
                },
                required: ['payload'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'run_node',
            description: 'Executes a specific node within a workflow.',
            parameters: {
                type: 'object',
                properties: {
                    nodeIdentifier: {
                        type: 'string',
                        description: 'The ID of the node to run.',
                    },
                    input: {
                        type: 'object',
                        description: 'The input payload for the node execution.',
                    },
                },
                required: ['nodeIdentifier', 'input'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'configure_node',
            description: 'Configures (updates settings for) a specific node within a workflow.',
            parameters: {
                type: 'object',
                properties: {
                    nodeIdentifier: {
                        type: 'string',
                        description: 'The ID of the node to configure.',
                    },
                    config: {
                        type: 'object',
                        description: 'The new configuration object for the node.',
                    },
                },
                required: ['nodeIdentifier', 'config'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'schedule_message',
            description: 'Schedules a message to be sent at a later time.',
            parameters: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'The content of the message to schedule.',
                    },
                    delayMinutes: {
                        type: 'number',
                        description: 'The delay in minutes before the message is sent.',
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'urgent'],
                        description: 'The priority of the scheduled message.',
                    },
                },
                required: ['message', 'delayMinutes'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'validate_node_config',
            description: 'Validates the configuration of a specific node.',
            parameters: {
                type: 'object',
                properties: {
                    // This will depend on the actual schema for node configs
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'mark_node_failed',
            description: 'Marks a node as failed, preventing it from being run again until manually reset.',
            parameters: {
                type: 'object',
                properties: {
                    nodeIdentifier: {
                        type: 'string',
                        description: 'The ID of the node to mark as failed.',
                    },
                    reason: {
                        type: 'string',
                        description: 'The reason the node is being marked as failed.',
                    },
                },
                required: ['nodeIdentifier', 'reason'],
            },
        },
    },
];

// --- TOOL EXECUTION FUNCTION ---
// This function dispatches to the correct tool handler.
export async function executeTool(supabase: SupabaseClient, userId: string, toolName: string, args: any): Promise<any> {
    console.log(`[lib/agent-tools.ts] Executing ${toolName} for ${userId}`, args);
    try {
        switch (toolName) {
            case 'get_active_context':
                return await getActiveContext(supabase, userId);
            case 'list_workflows':
                return await listWorkflows(supabase, userId, args.limit);
            case 'workflow_inspect':
                return await inspectWorkflow(supabase, userId, args.workflowId);
            case 'workflow_create':
                return await createWorkflow(supabase, userId, { name: args.name, description: args.description });
            case 'workflow_edit':
                return await editWorkflow(supabase, userId, args.workflowId, args.ops || []);
            case 'workflow_validate':
                return await validateWorkflow(supabase, userId, args.workflowId);
            case 'workflow_publish':
                return await publishWorkflow(supabase, userId, args.workflowId, args.commitMessage);
            case 'workflow_delete':
                return await deleteWorkflow(supabase, userId, args.workflowId);
            case 'workflow_run_plan':
                return await runWorkflowPlan(supabase, userId, {
                    workflowId: args.workflowId,
                    nodeIds: args.nodeIds,
                    startNodes: args.startNodes,
                    endNodes: args.endNodes,
                    includeDependencies: args.includeDependencies,
                    inputOverrides: args.inputOverrides
                });
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
                    chatId: undefined, // Will be handled by the runtime or in schedule_message if needed
                    workflowId: undefined
                });
            case 'validate_node_config':
                return await validateNodeConfig(args);
            case 'mark_node_failed':
                return await markNodeFailed(supabase, userId, args.nodeIdentifier, args.reason);
            default:
                // Check if it's an MCP tool (prefixed with mcp__)
                if (toolName.startsWith('mcp__')) {
                    return await executeMcpTool(supabase, userId, toolName, args);
                }
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[lib/agent-tools.ts] Error in ${toolName}:`, e);
        return { error: e.message || 'Failed to execute tool' };
    }
}

async function executeMcpTool(supabase: SupabaseClient, userId: string, namespacedName: string, args: any): Promise<any> {
    // Format: mcp__SERVER__TOOL
    const parts = namespacedName.split('__');
    if (parts.length < 3) return { error: "Invalid MCP tool name format" };

    const toolName = parts.slice(2).join('__'); // Rejoin in case tool name had __ (unlikely but safe)

    // For now, checks if the tool exists in DB and log execution.
    // TODO: Connect to actual MCP Runtime / Bridge
    const { data: tool } = await supabase
        .from('rune_mcp_tools')
        .select('*')
        .eq('tool_name', toolName)
        .single();

    if (!tool) {
        return { error: `MCP tool not found: ${toolName}` };
    }

    console.log(`[MCP] Executing ${toolName} on server... (Simulation)`);
    return {
        status: "success",
        output: `Executed ${toolName} successfully. (MCP Integration Pending)`,
        args_received: args
    };
}
