import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { messageId, decision } = await req.json();

    if (!messageId || !decision || !['approved', 'rejected'].includes(decision)) {
        return NextResponse.json({ error: 'Missing or invalid messageId/decision' }, { status: 400 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: message, error: msgError } = await supabase
        .from('rune_chat_messages')
        .select('id, chat_id, approval_status')
        .eq('id', messageId)
        .single();

    if (msgError || !message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const { data: ownedChat } = await supabase
        .from('rune_chats')
        .select('id')
        .eq('id', message.chat_id)
        .eq('user_id', user.id)
        .single();

    if (!ownedChat) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: updateError } = await supabase
        .from('rune_chat_messages')
        .update({
            approval_status: decision,
            approval_metadata: {
                userId: user.id,
                timestamp: new Date().toISOString()
            }
        })
        .eq('id', messageId);

    if (updateError) {
        return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });
    }

    // Mark newest waiting session for this chat to align with approval decision.
    const { data: session } = await supabase
        .from('rune_agent_sessions')
        .select('id')
        .eq('chat_id', message.chat_id)
        .eq('status', 'waiting_approval')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (session?.id) {
        await supabase
            .from('rune_agent_sessions')
            .update({
                status: decision === 'approved' ? 'approved' : 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', session.id);
    }

    if (decision === 'rejected') {
        return NextResponse.json({ status: 'rejected' });
    }

    return NextResponse.json({
        status: 'approved',
        resume: {
            sessionId: session?.id || null,
            chatId: message.chat_id
        }
    });
}
