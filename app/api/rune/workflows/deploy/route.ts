import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { workflowStore } from '@/lib/workflow-store';
import { assertNoInlineSecrets } from '@/lib/security/secrets-policy';

export async function POST(req: NextRequest) {
    try {
        const { workflow_id, commit_message } = await req.json();
        if (!workflow_id) {
            return NextResponse.json({ error: 'Missing workflow_id' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const workflow = await workflowStore.getWorkflow(supabase, workflow_id);
        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
        }

        assertNoInlineSecrets({ graph: workflow.graph, code: workflow.code || '' }, 'Workflow deploy');

        const newVersion = await workflowStore.deployVersion(
            supabase,
            workflow_id,
            workflow.graph,
            workflow.code || '',
            commit_message || 'Manual deployment',
            user.id,
            workflow.workflow_mode,
            workflow.workflow_mode_config,
        );

        return NextResponse.json({
            success: true,
            version: newVersion.version,
            version_number: newVersion.version_number,
            workflow_mode: newVersion.workflow_mode,
            workflow_mode_config: newVersion.workflow_mode_config,
            runId: null,
            message: `Deployed version ${newVersion.version}`,
        });
    } catch (error: any) {
        console.error('Deployment error:', error);
        return NextResponse.json(
            { error: `Failed to deploy workflow: ${error.message}` },
            { status: 500 },
        );
    }
}
