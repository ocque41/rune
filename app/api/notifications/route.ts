import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/notifications - List user's notifications
// POST /api/notifications - Create notification
// PATCH /api/notifications - Mark all as read

export async function GET(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let query = supabase
        .from('rune_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (unreadOnly) {
        query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count } = await supabase
        .from('rune_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

    return NextResponse.json({
        notifications: data || [],
        unreadCount: count || 0
    });
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { title, message, type, link, targetUserId } = body;

        // Allow system to create notifications for any user
        const userId = targetUserId || user.id;

        const { data, error } = await supabase
            .from('rune_notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type: type || 'agent',
                link
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ notification: data });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { notificationId, markAllRead } = body;

        if (markAllRead) {
            // Mark all as read
            await supabase
                .from('rune_notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
        } else if (notificationId) {
            // Mark specific notification as read
            await supabase
                .from('rune_notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', user.id);
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
