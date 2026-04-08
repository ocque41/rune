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

        // 1. Get current draft
        const { data: draft } = await supabase
            .from('rune_workflow_drafts')
            .select('draft_json')
            .eq('workflow_id', workflowId)
            .eq('user_id', user.id)
            .single();

        if (!draft) {
            return NextResponse.json({ error: 'No draft found to publish' }, { status: 404 });
        }

        // 2. Determine new version number
        const { data: latest } = await supabase
            .from('rune_workflow_versions')
            .select('version_number')
            .eq('workflow_id', workflowId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        const nextVersion = (latest?.version_number || 0) + 1;

        // 3. Create Version
        const { data: version, error } = await supabase
            .from('rune_workflow_versions')
            .insert({
                workflow_id: workflowId,
                user_id: user.id,
                version_number: nextVersion,
                definition_json: draft.draft_json
            })
            .select()
            .single();

        if (error) {
            console.error('Publish Version Error:', error);
            return NextResponse.json({ error: 'Failed to publish version' }, { status: 500 });
        }

        // 4. Update Main Workflow "Active" graph (optional, if we keep reusing it for legacy readers)
        await supabase
            .from('rune_workflows')
            .update({
                graph_json: draft.draft_json, // Keeping backward compatibility
                updated_at: new Date().toISOString()
            })
            .eq('id', workflowId);

        return NextResponse.json({ version });

    } catch (error) {
        console.error('Publish API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
