import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AgentDB } from '@/lib/agent-db';

// Next.js App Router dynamic route params
interface RouteParams {
    params: Promise<{ chatId: string }>;
}

export async function GET(req: NextRequest, props: RouteParams) {
    const params = await props.params; // Next.js 15+ await params
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = new AgentDB(supabase);
    // Security: RLS handles ownership check, but getChat returns null if not found/owned
    const chat = await db.getChat(params.chatId);

    if (!chat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch messages too? 
    // Playground `loadChat` expects `messages` in the response.
    // "setMessages(data.messages || [])"
    const messages = await db.getFormatMessages(params.chatId);

    return NextResponse.json({
        ...chat,
        messages
    });
}

export async function PATCH(req: NextRequest, props: RouteParams) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { title } = body;

        const db = new AgentDB(supabase);
        // Rename
        if (title) {
            await db.renameChat(params.chatId, title);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, props: RouteParams) {
    const params = await props.params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const db = new AgentDB(supabase);
        await db.deleteChat(params.chatId);
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
