
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AgentConfig } from '@/lib/agent/types';
import { GeminiAgentRuntime } from '@/lib/agent/runtimes/gemini-runtime';
import { getEffectiveAgentConfig } from '@/app/actions/agent-config';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { messageId, decision } = await req.json(); // decision: 'approved' | 'rejected'

    if (!messageId || !decision) {
        return NextResponse.json({ error: 'Missing messageId or decision' }, { status: 400 });
    }

    // 1. Verify User and Ownership
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Fetch the message
    const { data: message, error: msgError } = await supabase
        .from('rune_chat_messages')
        .select('*')
        .eq('id', messageId)
        .single();

    if (msgError || !message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

    // Check ownership (via chat_id -> rune_chats -> user_id, or trust RLS if enabled)
    // We trust RLS policies for now, but a double check is good if using service_role (which we aren't here)

    // 3. Update Status
    const { error: updateError } = await supabase
        .from('rune_chat_messages')
        .update({
            approval_status: decision,
            approval_metadata: { userId: user.id, timestamp: new Date().toISOString() }
        })
        .eq('id', messageId);

    if (updateError) return NextResponse.json({ error: 'Failed to update approval' }, { status: 500 });

    if (decision === 'rejected') {
        return NextResponse.json({ status: 'rejected' });
    }

    // 4. Resume Execution (If approved)
    // We need to re-instantiate the runtime and resume.
    // We need the config context used for this run.
    const chatId = message.chat_id;
    // ... Fetch context ... 
    // This part is tricky because we need to rebuild the context (workflowId, tools, etc.)
    // For now, we'll fetch effective config based on the chat's workflow_id.

    const { data: chat } = await supabase.from('rune_chats').select('workflow_id').eq('id', chatId).single();
    const config = await getEffectiveAgentConfig(chat?.workflow_id || undefined);

    // TODO: We need to inject the "previously configured" tools. 
    // If the chat was using standard tools, we can reload them.
    // If it was custom, we might need to store used_tools in the session.
    // Assuming standard tools + workflow tools for now.

    // Start Request
    // We can't easily stream FROM this POST handler to the client if the client expects a simple JSON ack.
    // Usually, "Approve" -> JSON OK -> Client calls /resume/stream?messageId=...
    // OR this POST returns the stream directly.

    return NextResponse.json({ status: 'approved', instruction: 'Client should reconnect to stream' });
}
