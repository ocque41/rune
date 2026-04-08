import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { workflowStore } from '@/lib/workflow-store';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const workflow = await workflowStore.getWorkflow(supabase, id);
        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({
            workflow: {
                ...workflow,
                graph_json: workflow.graph,
            },
        });
    } catch (error) {
        console.error('Get workflow error:', error);
        return NextResponse.json({ error: 'Failed to get workflow' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        await workflowStore.deleteWorkflow(supabase, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete workflow error:', error);
        return NextResponse.json({ error: 'Failed to delete workflow' }, { status: 500 });
    }
}
