// /Users/miguel/Documents/cumulus/rune/lib/agent-tools.ts
// This file has been reconstructed based on inferences from route.ts
// and will serve as the central definition and execution point for agent tools.

import { SupabaseClient } from '@supabase/supabase-js'; // Assuming SupabaseClient is available
import { isToolImplemented } from '@/lib/agent/tools-metadata';
import { redactSecrets } from '@/lib/security/secrets-policy';

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

type WorkflowNodeLike = { id: string };
type WorkflowEdgeLike = { source: string; target: string };

interface SubgraphOptions {
    nodeIds?: string[];
    startNodes?: string[];
    endNodes?: string[];
    includeDependencies?: boolean;
    inputOverrides?: Record<string, unknown>;
}

// --- TOOL HANDLERS ---
// These functions correspond to the tools defined in TOOLS_DEFINITION.
// They accept supabase, userId, and args, and return a Promise resolving to tool output.

export async function getActiveContext(supabase: SupabaseClient, userId: string): Promise<any> {
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('id, active_workflow_id, active_run_id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    return {
        status: 'success',
        context: session || null
    };
}

export async function listWorkflows(supabase: SupabaseClient, userId: string, limit?: number): Promise<any> {
    const max = Math.min(Math.max(limit || 20, 1), 100);
    const { data, error } = await supabase
        .from('rune_workflows')
        .select('id, name, description, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(max);

    if (error) {
        return { status: 'error', error: error.message };
    }

    return { status: 'success', workflows: data || [] };
}

export async function inspectWorkflow(supabase: SupabaseClient, userId: string, workflowId: string): Promise<any> {
    const { data, error } = await supabase
        .from('rune_workflows')
        .select('id, name, description, graph_json, updated_at')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        return { status: 'error', error: 'Workflow not found' };
    }

    const nodes = Array.isArray((data as any).graph_json?.nodes) ? (data as any).graph_json.nodes : [];
    const edges = Array.isArray((data as any).graph_json?.edges) ? (data as any).graph_json.edges : [];

    return {
        status: 'success',
        workflow: {
            id: data.id,
            name: data.name,
            description: data.description,
            nodes: nodes.length,
            edges: edges.length,
            updated_at: data.updated_at
        }
    };
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
    const max = Math.min(Math.max(limit || 20, 1), 100);
    let query = supabase
        .from('rune_runs')
        .select('id, workflow_id, status, started_at, finished_at, error')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(max);

    if (workflowId) {
        query = query.eq('workflow_id', workflowId);
    }

    const { data, error } = await query;
    if (error) {
        return { status: 'error', error: error.message };
    }

    return { status: 'success', runs: data || [] };
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
    const message = typeof payload?.message === 'string' ? payload.message.trim() : '';
    if (!message) {
        return { status: 'error', error: 'Message is required' };
    }

    const delayMinutes = Number.isFinite(payload?.delayMinutes) ? Math.max(0, Number(payload.delayMinutes)) : 0;
    const scheduledFor = new Date(Date.now() + delayMinutes * 60_000).toISOString();
    const priority = ['low', 'normal', 'high', 'urgent'].includes(payload?.priority) ? payload.priority : 'normal';

    const { data, error } = await supabase
        .from('rune_pending_messages')
        .insert({
            user_id: userId,
            chat_id: payload?.chatId || null,
            workflow_id: payload?.workflowId || null,
            message,
            priority,
            scheduled_for: scheduledFor
        })
        .select('id, scheduled_for')
        .single();

    if (error) {
        return { status: 'error', error: error.message };
    }

    return {
        status: 'success',
        message: 'Message scheduled.',
        pendingMessageId: data?.id,
        scheduledFor: data?.scheduled_for
    };
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
                        description: 'Optional delay in minutes before the message is sent. Defaults to 0.',
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high', 'urgent'],
                        description: 'The priority of the scheduled message.',
                    },
                },
                required: ['message'],
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
    console.log(`[lib/agent-tools.ts] Executing ${toolName} for ${userId}`, redactSecrets(args));
    try {
        // Normalize MCP naming variants
        if (toolName.startsWith('mcp:')) {
            const [, serverName, ...toolParts] = toolName.split(':');
            toolName = `mcp__${serverName || 'unknown'}__${toolParts.join(':')}`;
        }

        if (!toolName.startsWith('mcp__') && !isToolImplemented(toolName)) {
            return {
                error: `Tool '${toolName}' is not enabled for production execution.`,
                status: 'disabled'
            };
        }

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
                    return await executeMcpTool(supabase, userId, toolName, args);
                }
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[lib/agent-tools.ts] Error in ${toolName}:`, e);
        return { error: e.message || 'Failed to execute tool' };
    }
}

export async function executeToolCall(
    supabase: SupabaseClient,
    userId: string,
    toolName: string,
    args: any
): Promise<any> {
    return executeTool(supabase, userId, toolName, args);
}

export function findTool(toolName: string) {
    const definition = TOOLS_DEFINITION.find((tool) => tool.function.name === toolName);

    if (!definition) {
        return null;
    }

    // Legacy runtime compatibility: this variant has no request context, so it returns a clear error payload.
    return {
        name: definition.function.name,
        description: definition.function.description,
        handler: async (_args: any) => ({
            error: `Tool '${toolName}' cannot execute from the legacy runtime without user context.`
        })
    };
}

export function buildSubgraph<N extends WorkflowNodeLike, E extends WorkflowEdgeLike>(
    graph: { nodes?: N[]; edges?: E[] },
    options: SubgraphOptions = {}
): { nodes: N[]; edges: E[]; startNodes: string[] } {
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes.filter((n) => typeof n?.id === 'string') : [];
    const edges = Array.isArray(graph?.edges)
        ? graph.edges.filter((e) => typeof e?.source === 'string' && typeof e?.target === 'string')
        : [];

    if (nodes.length === 0) {
        return { nodes: [], edges: [], startNodes: [] };
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node] as const));
    const outgoing = new Map<string, Set<string>>();
    const incoming = new Map<string, Set<string>>();

    for (const node of nodes) {
        outgoing.set(node.id, new Set());
        incoming.set(node.id, new Set());
    }

    for (const edge of edges) {
        if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
            continue;
        }
        outgoing.get(edge.source)!.add(edge.target);
        incoming.get(edge.target)!.add(edge.source);
    }

    const normalizeIds = (ids?: string[]) =>
        (ids || []).filter((id, idx, all) => typeof id === 'string' && nodeMap.has(id) && all.indexOf(id) === idx);

    const explicitNodeIds = normalizeIds(options.nodeIds);
    const explicitStartNodes = normalizeIds(options.startNodes);
    const explicitEndNodes = normalizeIds(options.endNodes);
    const includeDependencies = options.includeDependencies ?? true;
    const hasFilter = explicitNodeIds.length > 0 || explicitStartNodes.length > 0 || explicitEndNodes.length > 0;

    const selected = new Set<string>();
    const endNodeSet = new Set(explicitEndNodes);

    const traverseForward = (seedId: string) => {
        const stack = [seedId];
        while (stack.length > 0) {
            const current = stack.pop()!;
            if (selected.has(current)) {
                continue;
            }
            selected.add(current);
            if (endNodeSet.has(current)) {
                continue;
            }
            for (const nextId of outgoing.get(current) || []) {
                if (!selected.has(nextId)) {
                    stack.push(nextId);
                }
            }
        }
    };

    const collectAncestors = (seedId: string) => {
        const stack = [seedId];
        while (stack.length > 0) {
            const current = stack.pop()!;
            if (!selected.has(current)) {
                selected.add(current);
            }
            for (const parentId of incoming.get(current) || []) {
                if (!selected.has(parentId)) {
                    stack.push(parentId);
                }
            }
        }
    };

    if (!hasFilter) {
        for (const node of nodes) {
            selected.add(node.id);
        }
    } else {
        for (const nodeId of explicitNodeIds) {
            selected.add(nodeId);
        }
        for (const startNodeId of explicitStartNodes) {
            traverseForward(startNodeId);
        }
        for (const endNodeId of explicitEndNodes) {
            selected.add(endNodeId);
        }

        if (explicitEndNodes.length > 0 && explicitStartNodes.length === 0) {
            for (const endNodeId of explicitEndNodes) {
                collectAncestors(endNodeId);
            }
        }
    }

    if (includeDependencies) {
        for (const nodeId of Array.from(selected)) {
            collectAncestors(nodeId);
        }
    }

    if (selected.size === 0) {
        for (const node of nodes) {
            selected.add(node.id);
        }
    }

    const selectedNodes = nodes.filter((node) => selected.has(node.id));
    const selectedNodeIdSet = new Set(selectedNodes.map((node) => node.id));
    const selectedEdges = edges.filter((edge) => selectedNodeIdSet.has(edge.source) && selectedNodeIdSet.has(edge.target));

    let startNodes: string[] = explicitStartNodes.filter((nodeId) => selectedNodeIdSet.has(nodeId));

    if (startNodes.length === 0 && explicitNodeIds.length > 0 && !includeDependencies) {
        startNodes = explicitNodeIds.filter((nodeId) => selectedNodeIdSet.has(nodeId));
    }

    if (startNodes.length === 0) {
        const incomingCount = new Map<string, number>();
        for (const node of selectedNodes) {
            incomingCount.set(node.id, 0);
        }
        for (const edge of selectedEdges) {
            incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
        }

        startNodes = selectedNodes
            .map((node) => node.id)
            .filter((nodeId) => (incomingCount.get(nodeId) || 0) === 0);
    }

    if (startNodes.length === 0 && selectedNodes.length > 0) {
        startNodes = [selectedNodes[0].id];
    }

    return {
        nodes: selectedNodes,
        edges: selectedEdges,
        startNodes
    };
}

async function executeMcpTool(supabase: SupabaseClient, userId: string, namespacedName: string, args: any): Promise<any> {
    // Supported formats:
    // - mcp__SERVER__TOOL
    // - mcp:SERVER:TOOL
    let serverName = '';
    let toolName = '';

    if (namespacedName.startsWith('mcp__')) {
        const parts = namespacedName.split('__');
        if (parts.length < 3) return { error: 'Invalid MCP tool name format' };
        serverName = parts[1];
        toolName = parts.slice(2).join('__');
    } else if (namespacedName.startsWith('mcp:')) {
        const parts = namespacedName.split(':');
        if (parts.length < 3) return { error: 'Invalid MCP tool name format' };
        serverName = parts[1];
        toolName = parts.slice(2).join(':');
    } else {
        return { error: 'Invalid MCP tool name format' };
    }

    const { data: tools } = await supabase
        .from('rune_mcp_tools')
        .select('id, server_id, tool_name, rune_mcp_servers!inner(name, user_id, status)')
        .eq('tool_name', toolName)
        .eq('rune_mcp_servers.user_id', userId)
        .eq('rune_mcp_servers.status', 'connected')
        .limit(25);

    const tool = (tools || []).find((candidate: any) => {
        const rawName = candidate.rune_mcp_servers?.name || '';
        const sanitizedName = rawName.replace(/[^a-zA-Z0-9_]/g, '_');
        return candidate.server_id === serverName || rawName === serverName || sanitizedName === serverName;
    });

    if (!tool) {
        return { error: `MCP tool not found or not connected: ${serverName}/${toolName}` };
    }

    console.log(`[MCP] Executing ${toolName} on server... (Simulation)`);
    return {
        status: "success",
        output: `Executed ${toolName} successfully. (MCP Integration Pending)`,
        args_received: args
    };
}
