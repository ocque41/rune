import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params;

    // Parse body if present
    let body = {};
    try {
        body = await request.json();
    } catch {
        // Body might be empty
    }

    return handleWorkflowTrigger(workflowId, body);
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params;
    // GET requests usually don't have a body, pass empty object or query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    return handleWorkflowTrigger(workflowId, searchParams);
}

async function handleWorkflowTrigger(workflowId: string, payload: any) {
    try {
        if (!workflowId) {
            return NextResponse.json(
                { success: false, error: 'Workflow ID is required' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        // 1. Fetch Latest Deployed Version
        const { data: latestVersion, error } = await supabase
            .from('rune_workflow_versions')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        if (error || !latestVersion) {
            console.error('Workflow version lookup failed:', error);
            return NextResponse.json(
                { success: false, error: 'Workflow not found or not deployed' },
                { status: 404 }
            );
        }

        const graph = latestVersion.graph_json;
        if (!graph || !graph.nodes || !graph.edges) {
            return NextResponse.json(
                { success: false, error: 'Invalid workflow graph data' },
                { status: 500 }
            );
        }

        // 2. Fetch Workflow Name
        const { data: wfMeta } = await supabase
            .from('rune_workflows')
            .select('name')
            .eq('id', workflowId)
            .single();

        const workflowName = wfMeta?.name || 'Unknown Workflow';

        // 3. Initialize Engine
        const engine = new WorkflowEngine(
            workflowId,
            workflowName,
            graph.nodes,
            graph.edges
        );

        // 4. Run Execution
        const runResult = await engine.run(payload);

        return NextResponse.json({
            success: true,
            message: 'Workflow executed successfully',
            runId: runResult.id,
            result: runResult.result
        });

    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to trigger workflow' },
            { status: 500 }
        );
    }
}
