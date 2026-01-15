import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/rune/chats - List user's chats
// POST /api/rune/chats - Create new chat

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const workflowId = url.searchParams.get('workflow_id');
    const includeTemporary = url.searchParams.get('include_temporary') === 'true';

    let query = supabase
        .from('rune_chats')
        .select(`
            id,
            title,
            workflow_id,
            is_temporary,
            created_at,
            updated_at,
            rune_chat_messages(id, role, content, created_at)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (workflowId) {
        query = query.eq('workflow_id', workflowId);
    }

    if (!includeTemporary) {
        query = query.eq('is_temporary', false);
    }

    const { data, error } = await query.limit(50);

    if (error) {
        console.error('[Chats API] Error fetching chats:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Format chats with preview
    const chats = data?.map(chat => ({
        id: chat.id,
        title: chat.title,
        workflowId: chat.workflow_id,
        isTemporary: chat.is_temporary,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        messageCount: chat.rune_chat_messages?.length || 0,
        preview: chat.rune_chat_messages?.[0]?.content?.slice(0, 100) || null
    })) || [];

    return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { workflowId, title, isTemporary } = body;

        const { data: chat, error } = await supabase
            .from('rune_chats')
            .insert({
                user_id: user.id,
                workflow_id: workflowId || null,
                title: title || 'New Chat',
                is_temporary: isTemporary || false
            })
            .select()
            .single();

        if (error) {
            console.error('[Chats API] Error creating chat:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ chat });
    } catch (e: any) {
        console.error('[Chats API] Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
