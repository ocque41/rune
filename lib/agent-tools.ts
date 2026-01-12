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
