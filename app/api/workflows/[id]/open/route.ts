import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';

export const runtime = 'edge';

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    try {
        const params = await props.params;
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const workflowId = params.id;

        // 1. Verify Ownership & Update last_opened_at
        const { data: workflow, error: wfError } = await supabase
            .from('rune_workflows')
            .update({ last_opened_at: new Date().toISOString() })
            .eq('id', workflowId)
            .eq('user_id', user.id)
            .select('id, name, graph_json')
            .single();

        if (wfError || !workflow) {
            return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
        }

        // 2. Fetch or Create Draft (Lazy Migration)
        let { data: draft } = await supabase
            .from('rune_workflow_drafts')
            .select('*')
            .eq('workflow_id', workflowId)
            .single();

        if (!draft) {
            // Create initial draft from existing main workflow definition
            const { data: newDraft, error: draftError } = await supabase
                .from('rune_workflow_drafts')
                .insert({
                    workflow_id: workflowId,
                    user_id: user.id,
                    draft_json: workflow.graph_json || {}
                })
                .select()
                .single();

            if (draftError) throw draftError;
            draft = newDraft;
        }

        // 3. Update/Create Agent Session
        // Check if there is a recent session (e.g. last 1 hour) or just update the latest one
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
                    active_workflow_id: workflowId,
                    active_draft_id: draft.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSession.id);
        } else {
            await supabase
                .from('rune_agent_sessions')
                .insert({
                    user_id: user.id,
                    active_workflow_id: workflowId,
                    active_draft_id: draft.id
                });
        }

        // 4. Fetch Latest Version Number
        const { data: latestVersion } = await supabase
            .from('rune_workflow_versions')
            .select('version_number')
            .eq('workflow_id', workflowId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        return NextResponse.json({
            draft,
            latestVersion: latestVersion?.version_number || 0
        });

    } catch (error) {
        console.error('Open Workflow API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
