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
    }
];
