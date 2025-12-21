import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;

        if (!workflowId) {
            return NextResponse.json(
                { success: false, error: 'Workflow ID is required' },
                { status: 400 }
            );
        }

        // Parse body if present
        let body = {};
        try {
            body = await request.json();
        } catch {
            // Body might be empty
        }

        const supabase = createAdminClient();

        // 1. Resolve Workflow ID (handle potential slug vs uuid if needed)
        // For now, assume workflowId param is the UUID. 
        // If we want to support slugs, we'd query rune_workflows by name first.

        // 2. Fetch Latest Deployed Version
        // We want the deployed snapshot, not the current draft in rune_workflows
        const { data: latestVersion, error } = await supabase
            .from('rune_workflow_versions')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        if (error || !latestVersion) {
            // Fallback: Check if the main workflow exists (maybe never deployed?)
            // Or return 404
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

        // 3. Initialize Engine
        // We might need to fetch the workflow name from the parent table if not in version
        // But let's verify if we need it. WorkflowEngine takes (id, name, nodes, edges).
        // Version table doesn't usually store name.

        // Quick fetch for name
        const { data: wfMeta } = await supabase
            .from('rune_workflows')
            .select('name')
            .eq('id', workflowId)
            .single();

        const workflowName = wfMeta?.name || 'Unknown Workflow';

        const engine = new WorkflowEngine(
            workflowId,
            workflowName,
            graph.nodes,
            graph.edges
        );

        // 4. Run Execution
        const runResult = await engine.run(body);

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
