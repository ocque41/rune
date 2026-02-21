import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/rune/chats/[id] - Get chat with messages
// DELETE /api/rune/chats/[id] - Delete chat
// PATCH /api/rune/chats/[id] - Update chat (title, etc.)

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { data: chat, error } = await supabase
        .from('rune_chats')
        .select(`
            id,
            title,
            workflow_id,
            is_temporary,
            created_at,
            updated_at,
            rune_chat_messages(
                id,
                role,
                content,
                tool_calls,
                tool_call_id,
                approval_status,
                created_at
            )
        `)
        .eq('id', id)
        .eq('user_id', user.id)
        .order('created_at', { referencedTable: 'rune_chat_messages', ascending: true })
        .single();

    if (error) {
        console.error('[Chats API] Error fetching chat:', error);
        return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Format messages for the client
    const messages = chat.rune_chat_messages?.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        toolCalls: msg.tool_calls,
        toolCallId: msg.tool_call_id,
        approval_status: msg.approval_status,
        createdAt: msg.created_at
    })) || [];

    return NextResponse.json({
        chat: {
            id: chat.id,
            title: chat.title,
            workflowId: chat.workflow_id,
            isTemporary: chat.is_temporary,
            createdAt: chat.created_at,
            updatedAt: chat.updated_at
        },
        messages
    });
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
        .from('rune_chats')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) {
        console.error('[Chats API] Error deleting chat:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    try {
        const body = await req.json();
        const updates: any = {};

        if (body.title !== undefined) updates.title = body.title;
        if (body.isTemporary !== undefined) updates.is_temporary = body.isTemporary;
        updates.updated_at = new Date().toISOString();

        const { data: chat, error } = await supabase
            .from('rune_chats')
            .update(updates)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            console.error('[Chats API] Error updating chat:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ chat });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
