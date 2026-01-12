
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { workflowStore } from '@/lib/workflow-store';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const start = performance.now();
    let userId = 'anon';
    let workflowIdString = '';

    try {
        const { id } = await params;
        workflowIdString = id;

        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) userId = user.id;

        console.log(`[WorkflowLoad] User: ${userId}, Workflow: ${id} - Starting load`);

        // Use store - handles column mapping and check RLS
        let workflow;
        try {
            workflow = await workflowStore.getWorkflow(supabase, id);
        } catch (e) {
            // Store threw error (likely not found or RLS block)
        }

        // --- RESCUE STRATEGY ---
        if (!workflow && user) {
            const adminClient = createAdminClient();
            const { data: adminWorkflow } = await adminClient
                .from('rune_workflows')
                .select('*')
                .eq('id', id)
                .single();

            const ANON_ID = '00000000-0000-0000-0000-000000000000';
            if (adminWorkflow && (adminWorkflow.user_id === ANON_ID || !adminWorkflow.user_id)) {
                console.log(`[WorkflowLoad] RESCUE: Claiming anonymous workflow ${id} for user ${user.id}`);

                await adminClient
                    .from('rune_workflows')
                    .update({ user_id: user.id })
                    .eq('id', id);

                workflow = {
                    ...adminWorkflow,
                    user_id: user.id,
                    graph: adminWorkflow.graph_json
                };
            }
        }
        // -----------------------

        if (!workflow) {
            console.log(`[WorkflowLoad] Failed: Not found or access denied. User: ${userId}, ID: ${id}`);
            return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
        }

        // --- ACTIVATE SESSION ---
        // Ensure the agent knows this is the active workflow
        if (user) {
            // Use admin to ensure we can upsert session implies we might need specific policy or just use admin for safety here 
            // actually we should use user client if policy allows, let's try user client first, effectively "upsert"
            // The policy "Users manage their own agent sessions" allows INSERT/UPDATE.

            // Check if session exists first to decide insert vs update (or upsert)
            // Supabase upsert needs primary key or unique constraint. 
            // We don't have a unique constraint on user_id on session table? 
            // Migration says: CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON rune_agent_sessions(user_id);
            // It does NOT say unique. So a user can have multiple sessions? 
            // usually "active session" implies one per user context.
            // Let's assume we update the "most recent" or create one if none.

            const { data: existingSession } = await supabase
                .from('rune_agent_sessions')
                .select('id')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (existingSession) {
                await supabase
                    .from('rune_agent_sessions')
                    .update({
                        active_workflow_id: workflow.id,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingSession.id);
            } else {
                await supabase
                    .from('rune_agent_sessions')
                    .insert({
                        user_id: user.id,
                        active_workflow_id: workflow.id,
                        updated_at: new Date().toISOString()
                    });
            }
            console.log(`[WorkflowLoad] Session activated for user ${user.id}, workflow ${workflow.id}`);
        }
        // -----------------------

        const duration = (performance.now() - start).toFixed(2);
        console.log(`[WorkflowLoad] Success. User: ${userId}, ID: ${id}. Took ${duration}ms`);

        return NextResponse.json({ workflow });

    } catch (error: any) {
        console.error(`[WorkflowLoad] Critical Error:`, error);
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
