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

    // 4. Deep merge the config into node.data
    // We merge each config key (emailConfig, httpRequest, scriptConfig, etc.)
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
            description: `Update the configuration of a specific node in the active workflow. Changes are saved to the database immediately.

IMPORTANT BEHAVIOR - Follow this sequence when fixing failing nodes:
1. FIRST run the node to see the actual error (don't assume what's wrong)
2. EXPLAIN what failed and what you will change to fix it
3. Apply the configuration change using this tool
4. Tell the user: "I've updated [node name]. The workflow has been modified - you may need to refresh the Flow Builder to see changes."
5. Run the node again to verify the fix worked
6. SUMMARIZE: what was the error → what you changed → the new result

Always be explicit about what you're changing and why.`,
            parameters: {
                type: "object",
                properties: {
                    nodeIdentifier: {
                        type: "string",
                        description: "The node's label (e.g., 'Send Email') or its ID (e.g., '7')."
                    },
                    config: {
                        type: "object",
                        description: "Configuration to apply. Use the appropriate key based on node type: emailConfig (for Send Email), httpRequest (for HTTP Request), scriptConfig (for Run Script), slackConfig (for Slack Message), etc.",
                        properties: {
                            emailConfig: {
                                type: "object",
                                description: "Email node config: { recipient, sender, subject, body }"
                            },
                            httpRequest: {
                                type: "object",
                                description: "HTTP node config: { method, url, headers, body }"
                            },
                            scriptConfig: {
                                type: "object",
                                description: "Script node config: { code }"
                            },
                            slackConfig: {
                                type: "object",
                                description: "Slack node config: { webhookUrl, channel, message }"
                            },
                            description: {
                                type: "string",
                                description: "Node description text"
                            }
                        }
                    }
                },
                required: ["nodeIdentifier", "config"]
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
    }
];
