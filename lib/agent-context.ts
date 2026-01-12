import { SupabaseClient } from '@supabase/supabase-js';

export interface AgentContext {
    user: {
        id: string;
        email?: string;
        name?: string;
        tier?: string;
    };
    active: {
        workflowId?: string;
        draftId?: string;
        runId?: string;
        nodeId?: string; // Currently selected node
    };
    workflow?: {
        id: string;
        name: string;
        description?: string;
        version: number;
        stats: {
            successRate: string;
            avgDuration: string;
            totalRuns: number;
        };
        structure: {
            nodes: Array<{ id: string; type: string; label: string; description?: string }>;
            edges: Array<{ source: string; target: string }>;
        };
    };
    recentRuns: Array<{
        id: string;
        status: string;
        startedAt: string;
        duration: string;
        error?: string;
    }>;
}

export async function buildAgentContext(
    supabase: SupabaseClient,
    userId: string,
    overrideWorkflowId?: string,
    selectedNodeId?: string
): Promise<AgentContext | null> {

    // 1. Fetch User Profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    // 2. Fetch Active Session
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    const workflowId = overrideWorkflowId || session?.active_workflow_id;
    const runId = session?.active_run_id;

    // 3. Fetch Workflow Context (if active)
    let workflowData = undefined;
    if (workflowId) {
        workflowData = await getWorkflowData(supabase, workflowId);
    }

    // 4. Fetch Recent Runs (scoped to workflow if active, otherwise global recent)
    let recentRuns = [];
    if (workflowId) {
        recentRuns = await getRecentRuns(supabase, userId, workflowId);
    } else {
        recentRuns = await getRecentRuns(supabase, userId);
    }

    return {
        user: {
            id: userId,
            email: profile?.email || 'unknown', // Profile might not have email depending on sync, but let's assume
            name: profile?.full_name || 'User',
            tier: profile?.tier || 'free'
        },
        active: {
            workflowId: workflowId || undefined,
            draftId: session?.active_draft_id || undefined,
            runId: runId || undefined,
            nodeId: selectedNodeId
        },
        workflow: workflowData,
        recentRuns
    };
}

async function getWorkflowData(supabase: SupabaseClient, workflowId: string) {
    // Determine which version/draft to show? 
    // For now, show the "main" workflow metadata + drafts if we had logic to merge.
    // The user wants "active draft" context. 
    // Let's fetch the main workflow table first.

    const { data: wf } = await supabase
        .from('rune_workflows')
        .select('id, name, description, graph_json')
        .eq('id', workflowId)
        .single();

    if (!wf) return undefined;

    // Fetch stats
    // ... (Simplified logic from generic route)
    const { count: totalRuns } = await supabase
        .from('rune_runs')
        .select('*', { count: 'exact', head: true })
        .eq('workflow_id', workflowId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: completedRuns } = await supabase
        .from('rune_runs')
        .select('created_at, completed_at')
        .eq('workflow_id', workflowId)
        .eq('status', 'completed')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    let successRate = 'N/A';
    let avgDuration = 'N/A';
    const total = totalRuns || 0;

    if (total > 0 && completedRuns) {
        successRate = `${Math.round((completedRuns.length / total) * 100)}%`;
        const durations = completedRuns.map((r: any) => {
            const start = new Date(r.created_at).getTime();
            const end = new Date(r.completed_at).getTime();
            return end - start;
        }).filter((d: number) => !isNaN(d) && d > 0);
        if (durations.length > 0) {
            const avg = durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
            avgDuration = `${(avg / 1000).toFixed(2)}s`;
        }
    }

    // Parse graph
    const graph = wf.graph_json || {};
    const nodes = (graph.nodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        label: n.data?.label || n.id,
        description: n.data?.description
    }));
    const edges = (graph.edges || []).map((e: any) => ({
        source: e.source,
        target: e.target
    }));

    return {
        id: wf.id,
        name: wf.name,
        description: wf.description,
        version: 0, // Todo: fetch actual version
        stats: { successRate, avgDuration, totalRuns: total },
        structure: { nodes, edges }
    };
}

async function getRecentRuns(supabase: SupabaseClient, userId: string, workflowId?: string) {
    let query = supabase
        .from('rune_runs')
        .select('id, status, created_at, completed_at, error_message')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (workflowId) {
        query = query.eq('workflow_id', workflowId);
    }

    const { data } = await query;
    return (data || []).map((r: any) => ({
        id: r.id,
        status: r.status,
        startedAt: r.created_at,
        duration: r.completed_at ? `${((new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / 1000).toFixed(1)}s` : '...',
        error: r.error_message
    }));
}
