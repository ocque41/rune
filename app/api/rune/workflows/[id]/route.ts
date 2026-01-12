
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { workflowStore } from '@/lib/workflow-store';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Use store - handles column mapping and check RLS
        // We wrap in try-catch because .single() throws if not found/0 rows
        let workflow;
        try {
            workflow = await workflowStore.getWorkflow(supabase, id);
        } catch (e) {
            // Ignore error for now, try rescue strategy
        }

        if (!workflow) {
            // RESCUE STRATEGY:
            // If the workflow exists but is owned by 'anonymous' (0000...), we claim it for the current user.
            // This handles the case where the user created it while the bug was active.

            if (user) {
                const adminClient = createAdminClient();
                const { data: adminWorkflow } = await adminClient
                    .from('rune_workflows')
                    .select('*')
                    .eq('id', id)
                    .single();

                // Check if it's an "anonymous" workflow
                const ANON_ID = '00000000-0000-0000-0000-000000000000';
                if (adminWorkflow && (adminWorkflow.user_id === ANON_ID || !adminWorkflow.user_id)) {
                    // Claim it!
                    console.log(`[WorkflowRescue] Claiming anonymous workflow ${id} for user ${user.id}`);
                    await adminClient
                        .from('rune_workflows')
                        .update({ user_id: user.id })
                        .eq('id', id);

                    // Now we can return it (mapped)
                    workflow = {
                        ...adminWorkflow,
                        user_id: user.id,
                        graph: adminWorkflow.graph_json
                    };
                }
            }
        }

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ workflow });

    } catch (error: any) {
        console.error('Get workflow error:', error);
        return NextResponse.json(
            { error: 'Failed to get workflow' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();

        await workflowStore.deleteWorkflow(supabase, id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete workflow error:', error);
        return NextResponse.json(
            { error: 'Failed to delete workflow' },
            { status: 500 }
        );
    }
}
