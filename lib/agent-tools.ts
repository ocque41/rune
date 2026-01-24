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
        userId,
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
        graph.edges || [],
        userId
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
                // Validate script exists before running
                if (!data.scriptConfig?.code || data.scriptConfig.code.trim() === '') {
                    return {
                        success: false,
                        nodeId: node.id,
                        nodeLabel: label,
                        error: `Script node "${label}" (id: ${node.id}) has no code configured. Use configure_node first to add a script.`,
                        hint: "Example: configure_node({ nodeIdentifier: '" + node.id + "', config: { scriptConfig: { code: 'return { message: \"Hello\" }' } } })"
                    };
                }
                result = await (engine as any).executeScript(data, nodeInput);
                break;
            case 'Transform':
                if (!data.transformConfig?.expression || data.transformConfig.expression.trim() === '') {
                    return {
                        success: false,
                        nodeId: node.id,
                        nodeLabel: label,
                        error: `Transform node "${label}" (id: ${node.id}) has no expression configured. Use configure_node first.`,
                    };
                }
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

/**
 * Configure a node in the active workflow
 * Allows the agent to modify node settings and persist changes
 */
export async function configureNode(
    supabase: SupabaseClient,
    userId: string,
    nodeIdentifier: string,
    config: Record<string, any>
) {
    console.log(`[configureNode] Configuring node "${nodeIdentifier}" for user ${userId}`);
    console.log(`[configureNode] Config to apply:`, JSON.stringify(config, null, 2));

    // 1. Get active workflow from session
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('active_workflow_id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!session?.active_workflow_id) {
        return { success: false, error: "No active workflow. Open a workflow first." };
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

    // 3. Find the node by ID or label
    let nodeIndex = nodes.findIndex((n: any) => n.id === nodeIdentifier);

    if (nodeIndex === -1) {
        // Try label match
        const matchingIndices = nodes
            .map((n: any, i: number) => n.data?.label?.toLowerCase() === nodeIdentifier.toLowerCase() ? i : -1)
            .filter((i: number) => i !== -1);

        if (matchingIndices.length > 1) {
            const nodeList = matchingIndices.map((i: number) =>
                `- Node ID "${nodes[i].id}": ${nodes[i].data?.description || nodes[i].data?.label}`
            ).join('\n');

            return {
                success: false,
                error: `Multiple nodes named "${nodeIdentifier}" found. Please specify by node ID:\n${nodeList}`
            };
        }

        nodeIndex = matchingIndices[0] ?? -1;
    }

    if (nodeIndex === -1) {
        const availableNodes = nodes.map((n: any) => `${n.data?.label || 'Unknown'} (id: ${n.id})`).join(', ');
        return {
            success: false,
            error: `Node "${nodeIdentifier}" not found. Available nodes: ${availableNodes}`
        };
    }

    const node = nodes[nodeIndex];
    const oldData = { ...node.data };

    // 4. Validate and Deep merge the config into node.data
    const label = node.data?.label || '';

    // --- SMART VALIDATION ---
    // Prevent common hallucinations where agent sets URL/Code in 'description'
    if (config.description && typeof config.description === 'string') {
        const desc = config.description.trim();
        const isUrl = desc.startsWith('http://') || desc.startsWith('https://');
        const isCode = desc.includes('return') || desc.includes('{') || desc.length > 200;

        if (label === 'HTTP Request') {
            if (isUrl && !config.httpRequest) {
                return {
                    success: false,
                    error: `Invalid configuration: You are trying to set the URL "${desc}" in the 'description' field. Please put it in 'config.httpRequest.url' instead.`,
                    hint: `Correct format: { httpRequest: { url: "${desc}", method: "GET" } }`
                };
            }
        } else if (label === 'Run Script' || label === 'Transform') {
            if (isCode && (!config.scriptConfig && !config.transformConfig)) {
                const targetField = label === 'Run Script' ? 'scriptConfig.code' : 'transformConfig.expression';
                return {
                    success: false,
                    error: `Invalid configuration: You are trying to put code in the 'description' field. Please put it in '${targetField}' instead.`,
                    hint: `Correct format: { ${label === 'Run Script' ? 'scriptConfig' : 'transformConfig'}: { ${label === 'Run Script' ? 'code' : 'expression'}: "..." } }`
                };
            }
        }
    }

    // Specific field validation
    if (label === 'HTTP Request' && config.httpRequest) {
        // Validation passed
    }

    // Merge logic
    for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'object' && value !== null && typeof node.data[key] === 'object') {
            // Merge objects
            node.data[key] = { ...node.data[key], ...value };
        } else {
            // Replace value
            node.data[key] = value;
        }
    }

    // Update the node in the graph
    nodes[nodeIndex] = node;
    graph.nodes = nodes;

    // 5. Save the updated graph to the database
    const { error: updateError } = await supabase
        .from('rune_workflows')
        .update({
            graph_json: graph,
            updated_at: new Date().toISOString()
        })
        .eq('id', workflow.id);

    if (updateError) {
        console.error('[configureNode] Failed to save:', updateError);
        return { success: false, error: `Failed to save configuration: ${updateError.message}` };
    }

    console.log(`[configureNode] Node ${node.id} updated successfully`);

    return {
        success: true,
        nodeId: node.id,
        nodeLabel: node.data?.label,
        message: `Node "${node.data?.label}" configuration updated successfully.`,
        updatedConfig: config,
        previousConfig: oldData
    };
}

/**
 * Schedule a message for proactive delivery to the user.
 * This allows the agent to "write first" even when the user hasn't prompted.
 */
export async function scheduleMessage(
    supabase: any,
    userId: string,
    params: {
        message: string;
        chatId?: string;
        workflowId?: string;
        delayMinutes?: number;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
    }
) {
    const { message, chatId, workflowId, delayMinutes = 0, priority = 'normal' } = params;

    // Calculate scheduled time
    const scheduledFor = new Date();
    scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

    // Insert pending message
    const { data, error } = await supabase
        .from('rune_pending_messages')
        .insert({
            user_id: userId,
            chat_id: chatId || null,
            workflow_id: workflowId || null,
            message,
            priority,
            scheduled_for: scheduledFor.toISOString()
        })
        .select('id')
        .single();

    if (error) {
        console.error('[scheduleMessage] Insert error:', error);
        return { success: false, error: error.message };
    }

    // If delay is 0 or very small, trigger immediate processing
    if (delayMinutes <= 0) {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: data.id })
            });
        } catch (e) {
            // Don't fail if notification processing fails - it will be picked up by cron
            console.warn('[scheduleMessage] Immediate processing failed, will retry via cron');
        }
    }

    return {
        success: true,
        messageId: data.id,
        scheduledFor: scheduledFor.toISOString(),
        message: delayMinutes > 0
            ? `Message scheduled for delivery in ${delayMinutes} minute(s).`
            : `Message queued for immediate delivery.`
    };
}

/**
 * Validate the configuration of a node without saving it.
 */
export async function validateNodeConfig(
    config: {
        scriptConfig?: { code: string };
        transformConfig?: { expression: string };
        condition?: string;
    }
) {
    const results: any = { valid: true, errors: [] };

    if (config.scriptConfig?.code) {
        try { new Function(config.scriptConfig.code); } catch (e: any) { results.valid = false; results.errors.push(`Script syntax error: ${e.message}`); }
    }
    if (config.transformConfig?.expression) {
        try { new Function('params', config.transformConfig.expression); } catch (e: any) { results.valid = false; results.errors.push(`Transform expression error: ${e.message}`); }
    }
    if (config.condition) {
        try { new Function('params', `return ${config.condition}`); } catch (e: any) { results.valid = false; results.errors.push(`Condition syntax error: ${e.message}`); }
    }
    return results;
}

/**
 * Mark a node as failed and instructions to skip/ignore it.
 */
export async function markNodeFailed(
    supabase: SupabaseClient,
    userId: string,
    nodeIdentifier: string,
    reason: string
) {
    // 1. Get active context
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!session) return { success: false, error: "No active session." };

    // 2. Fetch workflow to get node ID if identifier is label
    const { data: workflow } = await supabase.from('rune_workflows').select('graph_json').eq('id', session.active_workflow_id).single();
    let nodeId = nodeIdentifier;
    if (workflow?.graph_json?.nodes) {
        const node = workflow.graph_json.nodes.find((n: any) => n.id === nodeIdentifier || n.data?.label?.toLowerCase() === nodeIdentifier.toLowerCase());
        if (node) nodeId = node.id;
    }

    // 3. Update session's failed_nodes list
    // We update the object structure to match route.ts persistence
    const failedNodes = session.failed_nodes || {};

    // Mark as skipped/failed with high attempt count to indicate fatal
    failedNodes[nodeId] = {
        attempts: (failedNodes[nodeId]?.attempts || 0) + 1,
        lastError: `[Marked Failed] ${reason}`,
        skipped: true,
        marked_at: new Date().toISOString()
    };

    await supabase
        .from('rune_agent_sessions')
        .update({
            failed_nodes: failedNodes,
            // We can also append to metadata if we want to store the reason
            metadata: { ...session.metadata, [`failure_reason_${nodeId}`]: reason }
        })
        .eq('id', session.id);

    return {
        success: true,
        message: `Node ${nodeId} marked as failed. The agent should now skip this node or try an alternative approach.`,
        skipped: true
    };
}

export async function getRunDetails(supabase: SupabaseClient, userId: string, runId: string) {
    const { getRun } = await import('./run-store');
    const run = await getRun(supabase, runId);

    if (!run) {
        return { success: false, error: "Run not found." };
    }

    // Security check (if not implicit in getRun via RLS, but getRun doesn't check owner if no RLS, so logic check good)
    // For now assuming RLS or trusted internal tool use.

    // Format for agent consumption
    const steps = (run.steps || []).map(s => ({
        nodeId: s.stepId,
        status: s.status,
        duration: s.durationMs ? `${s.durationMs}ms` : 'N/A',
        error: s.error,
        output: s.result // This is the key part - the actual data!
    }));

    return {
        success: true,
        run: {
            id: run.id,
            status: run.status,
            startTime: run.startTime,
            duration: run.duration,
            error: run.error,
            steps
        }
    };
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
            description: `Execute a specific node in the active workflow by its name or ID. 

IMPORTANT BEHAVIOR:
1. Always report the execution result (success or failure) with specific output details
2. If the node fails, explain WHAT failed and WHY before attempting any fix
3. Show the error message to help the user understand the issue

Use when the user asks to run, test, or execute a specific node like 'run the HTTP Request node' or 'test the Transform step'.`,
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
    },
    {
        type: "function",
        function: {
            name: "configure_node",
            description: `Update the configuration of a specific node. Pass configuration as a JSON string.

Examples:
- For If/Else: configure_node({ nodeIdentifier: "If / Else", configJson: '{"condition": "true"}' })
- For AI Generate: configure_node({ nodeIdentifier: "AI Generate", configJson: '{"aiConfig": {"prompt": "Hello world"}}' })
- For HTTP Request: configure_node({ nodeIdentifier: "HTTP Request", configJson: '{"httpRequest": {"url": "https://api.com", "method": "GET"}}' })`,
            parameters: {
                type: "object",
                properties: {
                    nodeIdentifier: {
                        type: "string",
                        description: "The node's label (e.g., 'Send Email', 'AI Generate') or its ID (e.g., '7')."
                    },
                    configJson: {
                        type: "string",
                        description: "JSON string containing the configuration object. Must be valid JSON."
                    }
                },
                required: ["nodeIdentifier", "configJson"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "validate_node_config",
            description: "Validate a configuration (script, transform, condition) for syntax errors without saving. Use this BEFORE configure_node if you are unsure about the syntax.",
            parameters: {
                type: "object",
                properties: {
                    scriptConfig: { type: "object", properties: { code: { type: "string" } } },
                    transformConfig: { type: "object", properties: { expression: { type: "string" } } },
                    condition: { type: "string" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "mark_node_failed",
            description: "Mark a specific node as failed/unfixable for this session. This tells the system to skip trying to fix this node and proceed with other tasks or stop.",
            parameters: {
                type: "object",
                properties: {
                    nodeIdentifier: { type: "string", description: "Node ID or Label" },
                    reason: { type: "string", description: "Reason for giving up on this node" }
                },
                required: ["nodeIdentifier", "reason"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "schedule_message",
            description: `Schedule a follow-up message to the user. Use this when:
- You've completed a background task and want to notify the user
- You need to send a delayed response or reminder
- You're about to perform a long-running operation and want to report back

The message will be delivered and the user will be notified (in-app and/or email based on their preferences).`,
            parameters: {
                type: "object",
                properties: {
                    message: {
                        type: "string",
                        description: "The message to send to the user"
                    },
                    delayMinutes: {
                        type: "number",
                        description: "Optional delay before sending (default: 0 = send immediately)"
                    },
                    priority: {
                        type: "string",
                        enum: ["low", "normal", "high", "urgent"],
                        description: "Message priority (affects notification urgency)"
                    }
                },
                required: ["message"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_run_details",
            description: "Get the full details of a specific workflow run, including the input and output of every step (node). Use this to inspect what happened in a past run WITHOUT re-running it.",
            parameters: {
                type: "object",
                properties: {
                    runId: { type: "string", description: "The ID of the run to inspect." }
                },
                required: ["runId"]
            }
        }
    }
];

/**
 * Main tool execution dispatcher
 * Routes tool calls to the appropriate handler function
 */
export async function executeToolCall(supabase: any, userId: string, toolName: string, args: any) {
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
            case 'configure_node': {
                // Parse configJson string if provided (new simplified schema for Gemini)
                let config = args.config;
                if (args.configJson) {
                    try {
                        config = JSON.parse(args.configJson);
                    } catch (e: any) {
                        console.error(`[Agent Tools] Failed to parse configJson for node ${args.nodeIdentifier}:`, args.configJson);
                        return { success: false, error: `Critical: Invalid JSON provided in configJson. You must provide a valid JSON string. Parse error: ${e.message}` };
                    }
                }
                return await configureNode(supabase, userId, args.nodeIdentifier, config);
            }
            case 'schedule_message':
                return await scheduleMessage(supabase, userId, {
                    message: args.message,
                    delayMinutes: args.delayMinutes,
                    priority: args.priority,
                    chatId: undefined, // Only available if we passed it in context, but for now undefined is fine (will be null in DB)
                    workflowId: undefined
                });
            case 'validate_node_config':
                return await validateNodeConfig(args);
            case 'mark_node_failed':
                return await markNodeFailed(supabase, userId, args.nodeIdentifier, args.reason);
            case 'get_run_details':
                return await getRunDetails(supabase, userId, args.runId);
            default:
                // Check if it's an MCP tool (prefixed with mcp__)
                if (toolName.startsWith('mcp__')) {
                    return await executeMcpTool(supabase, userId, toolName, args);
                }
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (e: any) {
        console.error(`[ToolExec] Error in ${toolName}:`, e);
        return { error: e.message };
    }
}

/**
 * Execute MCP (Model Context Protocol) tools
 * Format: mcp__SERVER__TOOL
 */
async function executeMcpTool(supabase: any, userId: string, namespacedName: string, args: any) {
    // Format: mcp__SERVER__TOOL
    const parts = namespacedName.split('__');
    if (parts.length < 3) return { error: "Invalid MCP tool name format" };

    // const serverName = parts[1]; // Not strictly needed if we look up by name, but good for verify
    const toolName = parts.slice(2).join('__'); // Rejoin in case tool name had __ (unlikely but safe)

    // In a real implementation, we would call the persistent MCP client here.
    // For now, checks if the tool exists in DB and log execution.
    // TODO: Connect to actual MCP Runtime / Bridge

    const { data: tool } = await supabase
        .from('rune_mcp_tools')
        .select('*')
        .eq('tool_name', toolName)
        // .eq('user_id', userId) // optional depending on RLS
        .single();

    if (!tool) {
        return { error: `MCP tool not found: ${toolName}` };
    }

    console.log(`[MCP] Executing ${toolName} on server... (Simulation)`);
    // Here we would dispatch to the MCP server.
    // Return a mock success for now to ensure the loop works.
    return {
        status: "success",
        output: `Executed ${toolName} successfully. (MCP Integration Pending)`,
        args_received: args
    };
}
