
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { workflowStore } from '@/lib/workflow-store';

export async function POST(req: NextRequest) {
    try {
        const { workflow_id, commit_message } = await req.json();

        if (!workflow_id) {
            return NextResponse.json({ error: 'Missing workflow_id' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get authenticated user ID for RLS
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // 1. Fetch current workflow state (RLS secured)
        // If user doesn't own it, this returns null/error usually (or empty data if RLS filters).
        const workflow = await workflowStore.getWorkflow(supabase, workflow_id);

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
        }

        // 2. Deploy Version (pass userId for RLS)
        const newVersion = await workflowStore.deployVersion(
            supabase,
            workflow_id,
            workflow.graph,
            workflow.code || '',
            commit_message || 'Manual Deployment',
            userId
        );

        return NextResponse.json({
            success: true,
            version: newVersion.version,
            runId: null,
            message: `Deployed version ${newVersion.version}`
        });

    } catch (error: any) {
        console.error('Deployment error:', error);
        return NextResponse.json(
            { error: 'Failed to deploy workflow: ' + error.message },
            { status: 500 }
        );
    }
}
