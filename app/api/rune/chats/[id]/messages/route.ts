import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/rune/chats/[id]/messages - Add message to chat

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;

    try {
        const body = await req.json();
        const { role, content, toolCalls, toolCallId } = body;

        if (!role) {
            return NextResponse.json({ error: 'Role is required' }, { status: 400 });
        }

        // Verify chat belongs to user
        const { data: chat } = await supabase
            .from('rune_chats')
            .select('id')
            .eq('id', chatId)
            .eq('user_id', user.id)
            .single();

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        // Insert message
        const { data: message, error: msgError } = await supabase
            .from('rune_chat_messages')
            .insert({
                chat_id: chatId,
                role,
                content: content || null,
                tool_calls: toolCalls || null,
                tool_call_id: toolCallId || null
            })
            .select()
            .single();

        if (msgError) {
            console.error('[Messages API] Error inserting message:', msgError);
            return NextResponse.json({ error: msgError.message }, { status: 500 });
        }

        // Update chat's updated_at
        await supabase
            .from('rune_chats')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', chatId);

        return NextResponse.json({
            message: {
                id: message.id,
                role: message.role,
                content: message.content,
                toolCalls: message.tool_calls,
                toolCallId: message.tool_call_id,
                createdAt: message.created_at
            }
        });
    } catch (e: any) {
        console.error('[Messages API] Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

// GET /api/rune/chats/[id]/messages - Get messages for a chat
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: chatId } = await params;

    // Verify chat ownership
    const { data: chat } = await supabase
        .from('rune_chats')
        .select('id')
        .eq('id', chatId)
        .eq('user_id', user.id)
        .single();

    if (!chat) {
        return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const { data: messages, error } = await supabase
        .from('rune_chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        messages: messages?.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            toolCalls: msg.tool_calls,
            toolCallId: msg.tool_call_id,
            createdAt: msg.created_at
        })) || []
    });
}
