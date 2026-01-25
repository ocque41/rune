import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AgentDB } from '@/lib/agent-db';

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const workflowId = searchParams.get('workflow_id');
    const includeTemporary = searchParams.get('include_temporary') === 'true';

    // If no workflow ID, maybe return all? Or error?
    // For now require workflow id as per requirement "scoped to workflow"
    if (!workflowId) {
        return NextResponse.json({ error: 'Missing workflow_id' }, { status: 400 });
    }

    const db = new AgentDB(supabase);

    try {
        const chats = await db.listChats(workflowId);

        // Filter temporary if needed (though DB layer returns all currently)
        const finalChats = includeTemporary
            ? chats
            : chats.filter(c => !c.is_temporary);

        return NextResponse.json({ chats: finalChats });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { workflowId, title } = body;

        if (!workflowId) {
            return NextResponse.json({ error: 'Missing workflowId' }, { status: 400 });
        }

        const db = new AgentDB(supabase);
        const chat = await db.createChat(user.id, workflowId, title);

        return NextResponse.json(chat);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
