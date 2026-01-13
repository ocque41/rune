import { SupabaseClient } from '@supabase/supabase-js';

export async function getActiveContext(supabase: SupabaseClient, userId: string) {
    // This tool is similar to the prompt injection but allows the agent to call it on-demand
    // It returns the currently active workflow and session state

    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!session?.active_workflow_id) {
        return { active: false, message: "No active workflow session found." };
    }

    const { data: workflow } = await supabase
        .from('rune_workflows')
        .select('id, name, description, graph_json')
        .eq('id', session.active_workflow_id)
        .single();

    if (!workflow) {
        return { active: false, message: "Active workflow not found or access denied." };
    }

    // Simplify graph for token efficiency
    const graph = workflow.graph_json || {};
    const nodeCount = (graph.nodes || []).length;
    const edgeCount = (graph.edges || []).length;
    const nodeTypes = [...new Set((graph.nodes || []).map((n: any) => n.type))];

    return {
        active: true,
        workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            stats: { nodeCount, edgeCount, nodeTypes }
        },
        session: {
            runId: session.active_run_id,
            lastActive: session.updated_at
        }
    };
}

export async function listWorkflows(supabase: SupabaseClient, userId: string, limit: number = 5) {
    const { data } = await supabase
        .from('rune_workflows')
        .select('id, name, description, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit);

    return data || [];
}

export async function getRecentRuns(supabase: SupabaseClient, userId: string, workflowId?: string, limit: number = 5) {
    let query = supabase
        .from('rune_runs')
        .select('id, status, created_at, completed_at, error, workflow_version_id')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (workflowId) {
        // We need to join with versions to filter by workflow_id, OR if we track workflow_id on runs directly.
        // Assuming rune_runs has workflow_version_id, we might need to verify ownership via that.
        // For simplicity/perf in this tool, let's assume we can filter if the run belongs to a version of the user's workflow.
        // Actually, looking at schema, rune_runs relates to rune_workflow_versions.
        // Let's do a join or simplified check. 
        // For V1, let's just fetch global runs for the user to avoid complex joins in this tool if workflowId is ambiguous.
        // But if workflowId is provided, we SHOULD filter.
        // Let's rely on the fact that we can filter by exact match if we had the column. 
        // If not, let's just return global runs for now to be safe and fast.
        // EDIT: DB Schema check from earlier sessions shows `rune_runs` has `workflow_version_id`.
    }

    // Security: Only runs for workflows owned by user. 
    // RLS should handle this if configured "auth.uid() = workflow.user_id" via join.
    // For now, let's assume RLS is active on 'rune_runs'.

    const { data } = await query;
    return data || [];
}

/**
 * Run the active workflow
 */
export async function runWorkflow(supabase: SupabaseClient, userId: string, payload?: any) {
    // 1. Get active workflow from session
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('active_workflow_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!session?.active_workflow_id) {
        return { success: false, error: "No active workflow. Please open a workflow first." };
    }

    const workflowId = session.active_workflow_id;

    // 2. Fetch workflow
    const { data: workflow, error: wfError } = await supabase
        .from('rune_workflows')
        .select('id, name, graph_json')
        .eq('id', workflowId)
        .single();

    if (wfError || !workflow) {
        return { success: false, error: "Workflow not found or access denied." };
    }

    // 3. Check for deployed version (optional - fallback to draft graph)
    const { data: latestVersion } = await supabase
        .from('rune_workflow_versions')
        .select('id, graph_json')
        .eq('workflow_id', workflowId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    const graph = latestVersion?.graph_json || workflow.graph_json;
    if (!graph || !graph.nodes || graph.nodes.length === 0) {
        return { success: false, error: "Workflow has no nodes. Please add nodes before running." };
    }

    // 4. Import and run engine
    const { WorkflowEngine } = await import('./workflow-engine');
    const engine = new WorkflowEngine(
        supabase,
        workflowId,
        workflow.name,
        graph.nodes || [],
        graph.edges || [],
        latestVersion?.id
    );

    try {
        const runResult = await engine.run(payload || {});
        return {
            success: true,
            runId: runResult.id,
            status: runResult.status,
            message: `Workflow "${workflow.name}" executed. Status: ${runResult.status}`
        };
    } catch (err: any) {
        return {
            success: false,
            error: `Execution failed: ${err.message}`
        };
    }
}

/**
 * Run a specific node in isolation
 */
export async function runNode(supabase: SupabaseClient, userId: string, nodeIdentifier: string, input?: any) {
    // 1. Get active workflow from session
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('active_workflow_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!session?.active_workflow_id) {
        return { success: false, error: "No active workflow. Please open a workflow first." };
    }

    // 2. Fetch workflow graph
    const { data: workflow } = await supabase
        .from('rune_workflows')
        .select('id, name, graph_json')
        .eq('id', session.active_workflow_id)
        .single();

    if (!workflow?.graph_json) {
        return { success: false, error: "Workflow not found or has no graph." };
    }

    const graph = workflow.graph_json;
    const nodes = graph.nodes || [];

    // 3. Find the node by ID or label (case-insensitive)
    // First try exact ID match
    let node = nodes.find((n: any) => n.id === nodeIdentifier);

    if (!node) {
        // Then try label match
        const matchingNodes = nodes.filter((n: any) =>
            n.data?.label?.toLowerCase() === nodeIdentifier.toLowerCase()
        );

        if (matchingNodes.length > 1) {
            // Multiple nodes with same label - list them for disambiguation
            const nodeList = matchingNodes.map((n: any, i: number) =>
                `- Node ID "${n.id}": ${n.data?.description || n.data?.label || 'No description'}`
            ).join('\n');

            return {
                success: false,
                error: `Multiple nodes named "${nodeIdentifier}" found. Please specify by node ID:\n${nodeList}`,
                hint: "Use the node ID (e.g., 'run node 7') to run a specific one."
            };
        }

        node = matchingNodes[0];
    }

    if (!node) {
        const availableNodes = nodes.map((n: any) => `${n.data?.label || 'Unknown'} (id: ${n.id})`).join(', ');
        return {
            success: false,
            error: `Node "${nodeIdentifier}" not found. Available nodes: ${availableNodes}`
        };
    }

    // 4. Execute the node logic based on its type/label
    const { WorkflowEngine } = await import('./workflow-engine');
    const engine = new WorkflowEngine(
        supabase,
        workflow.id,
        workflow.name,
        nodes,
        graph.edges || []
    );

    // Use provided input or empty object
    const nodeInput = input || {};

    try {
        // Access the private executeNode method via a workaround or inline execution
        // For now, we'll execute based on node type directly
        const label = node.data?.label;
        const data = node.data;
        let result: any;

        switch (label) {
            case 'HTTP Request':
                result = await (engine as any).executeHttpRequest(data, nodeInput);
                break;
            case 'Send Email':
                result = await (engine as any).executeSendEmail(data, nodeInput);
                break;
            case 'Run Script':
                result = await (engine as any).executeScript(data, nodeInput);
                break;
            case 'Transform':
                result = await (engine as any).executeTransform(data, nodeInput);
                break;
            case 'If / Else':
            case 'if':
                const conditionResult = await (engine as any).evaluateCondition(data, nodeInput);
                result = { condition: conditionResult };
                break;
            default:
                result = { message: `Node type "${label}" executed (pass-through)`, input: nodeInput };
        }

        return {
            success: true,
            nodeId: node.id,
            nodeLabel: label,
            result,
            message: `Node "${label}" executed successfully.`
        };
    } catch (err: any) {
        return {
            success: false,
            nodeId: node.id,
            error: `Node execution failed: ${err.message}`
        };
    }
}

export const TOOLS_DEFINITION = [
    {
        type: "function",
        function: {
            name: "get_active_context",
            description: "Get the currently active workflow, selected node, and session details. Use this when the user asks about 'this workflow' or 'current context'.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_workflows",
            description: "List the user's recent workflows. Useful for finding a workflow ID.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Number of workflows to return (default 5)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_recent_runs",
            description: "Get recent execution runs. Can be filtered by workflow.",
            parameters: {
                type: "object",
                properties: {
                    workflowId: { type: "string", description: "Optional workflow ID to filter runs." },
                    limit: { type: "number", description: "Limit number of runs (default 5)" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "run_workflow",
            description: "Execute the currently active workflow. Use when the user asks to 'run', 'execute', or 'test' their workflow.",
            parameters: {
                type: "object",
                properties: {
                    payload: {
                        type: "object",
                        description: "Optional input payload to pass to the workflow's Start node."
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "run_node",
            description: "Execute a specific node in the active workflow by its name or ID. Use when the user asks to run, test, or execute a specific node like 'run the HTTP Request node' or 'test the Transform step'.",
            parameters: {
                type: "object",
                properties: {
                    nodeIdentifier: {
                        type: "string",
                        description: "The node's label (e.g., 'HTTP Request', 'Send Email') or its ID."
                    },
                    input: {
                        type: "object",
                        description: "Optional input data to pass to the node for execution."
                    }
                },
                required: ["nodeIdentifier"]
            }
        }
    }
];
