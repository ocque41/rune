
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { workflow_id } = await req.json();

        if (!workflow_id) {
            return NextResponse.json({ error: 'Missing workflow_id' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Fetch current workflow state
        const { data: workflow, error: wfError } = await supabase
            .from('rune_workflows')
            .select('*')
            .eq('id', workflow_id)
            .single();

        if (wfError || !workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        // 2. Insert new version using the current state
        // Note: Deployment now freezes the *current* state of the workflow
        const { error: insertError, data: newVersion } = await supabase
            .from('rune_workflow_versions')
            .insert({
                workflow_id: workflow_id,
                // user_id is handled by RLS or trigger, or we pass it if in admin context. 
                // Since this is admin client, we might need to pass the user_id from the workflow if RLS isn't auto-setting it.
                user_id: workflow.user_id,
                version: (await getNextVersion(supabase, workflow_id)),
                code: workflow.code,
                graph: workflow.graph, // Was graph_json, new schema uses 'graph'
                deployed_at: new Date().toISOString()
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            version: newVersion.version,
            message: `Deployed version ${newVersion.version}`
        });

    } catch (error: unknown) {
        console.error('Deployment error:', error);
        return NextResponse.json(
            { error: 'Failed to deploy workflow' },
            { status: 500 }
        );
    }
}

async function getNextVersion(supabase: any, workflowId: string): Promise<number> {
    const { data: latestVersionData } = await supabase
        .from('rune_workflow_versions')
        .select('version')
        .eq('workflow_id', workflowId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    return (latestVersionData?.version || 0) + 1;
}
