import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
        const body = await req.json();
        const { draft_json } = body;

        if (!draft_json) {
            return NextResponse.json({ error: 'Missing draft_json' }, { status: 400 });
        }

        // 1. Check access (Updating drafts table)
        // RLS should handle it, but we explicit check via constraints
        const { data: draft, error } = await supabase
            .from('rune_workflow_drafts')
            .upsert({
                workflow_id: workflowId,
                user_id: user.id,
                draft_json,
                updated_at: new Date().toISOString()
            }, { onConflict: 'workflow_id' })
            .select()
            .single();

        if (error) {
            console.error('Save Draft Error:', error);
            return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
        }

        // 2. Touch parent workflow updated_at
        await supabase
            .from('rune_workflows')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', workflowId);

        return NextResponse.json({ draft });

    } catch (error) {
        console.error('Save Draft API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
