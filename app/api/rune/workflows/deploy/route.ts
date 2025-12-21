
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

        // 2. Fetch latest version number to increment
        const { data: latestVersionData, error: versionError } = await supabase
            .from('rune_workflow_versions')
            .select('version')
            .eq('workflow_id', workflow_id)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        // If no versions exist, start at 1. If error is "not found" (PGRST116), it means 0 rows, so 1.
        let nextVersion = 1;
        if (latestVersionData) {
            nextVersion = latestVersionData.version + 1;
        }

        // 3. Create new version
        const { error: insertError } = await supabase
            .from('rune_workflow_versions')
            .insert({
                workflow_id: workflow_id,
                version: nextVersion,
                code: workflow.code,
                graph_json: workflow.graph_json,
                created_at: new Date().toISOString()
            });

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            version: nextVersion,
            message: `Deployed version ${nextVersion}`
        });

    } catch (error: unknown) {
        console.error('Deployment error:', error);
        return NextResponse.json(
            { error: 'Failed to deploy workflow' },
            { status: 500 }
        );
    }
}
