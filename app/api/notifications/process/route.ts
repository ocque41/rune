import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPendingMessages } from '@/lib/notifications/process';

// POST /api/notifications/process - Process pending messages and send notifications
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await req.json().catch(() => ({}));
        const { messageId } = body;

        const result = await processPendingMessages(supabase, { messageId });
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[Notifications] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
