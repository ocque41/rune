import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

// POST /api/notifications/process - Process pending messages and send notifications
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const body = await req.json().catch(() => ({}));
        const { messageId } = body;

        // Build query - either specific message or all due
        let query = supabase
            .from('rune_pending_messages')
            .select(`
                *,
                users:user_id (
                    id,
                    email,
                    raw_user_meta_data
                )
            `)
            .is('sent_at', null)
            .lte('scheduled_for', new Date().toISOString());

        if (messageId) {
            query = query.eq('id', messageId);
        }

        const { data: pendingMessages, error } = await query.limit(50);

        if (error) {
            console.error('[Notifications] Query error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!pendingMessages || pendingMessages.length === 0) {
            return NextResponse.json({ processed: 0, message: 'No pending messages' });
        }

        console.log(`[Notifications] Processing ${pendingMessages.length} message(s)`);

        const results = await Promise.allSettled(
            pendingMessages.map(async (msg: any) => {
                try {
                    // Get user notification preferences
                    const { data: prefs } = await supabase
                        .from('rune_notification_preferences')
                        .select('*')
                        .eq('user_id', msg.user_id)
                        .single();

                    const emailEnabled = prefs?.email_enabled ?? true;
                    const userEmail = prefs?.email_address || msg.users?.email;

                    // Send email notification if enabled
                    if (emailEnabled && userEmail) {
                        const priorityEmojis: Record<string, string> = {
                            low: 'ℹ️',
                            normal: '💬',
                            high: '⚡',
                            urgent: '🚨'
                        };
                        const priorityEmoji = priorityEmojis[msg.priority as string] || '💬';

                        await sendEmail({
                            to: userEmail,
                            subject: `${priorityEmoji} Rune Agent: New Message`,
                            html: `
                                <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
                                    <h2 style="color: #3b82f6; margin-bottom: 16px;">Your Rune Agent has a message</h2>
                                    <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                        <p style="margin: 0; white-space: pre-wrap;">${msg.message}</p>
                                    </div>
                                    <p style="color: #71717a; font-size: 14px;">
                                        <a href="${process.env.NEXT_PUBLIC_APP_URL}/flow-builder${msg.workflow_id ? `?id=${msg.workflow_id}` : ''}" style="color: #3b82f6;">
                                            View in Rune →
                                        </a>
                                    </p>
                                </div>
                            `
                        });
                    }

                    // If there's a chat_id, also add the message to the chat
                    if (msg.chat_id) {
                        await supabase.from('rune_chat_messages').insert({
                            chat_id: msg.chat_id,
                            role: 'assistant',
                            content: msg.message
                        });
                    }

                    // Create in-app notification
                    const inAppEnabled = prefs?.in_app_enabled ?? true;
                    if (inAppEnabled) {
                        await supabase.from('rune_notifications').insert({
                            user_id: msg.user_id,
                            title: 'Agent Message',
                            message: msg.message.slice(0, 200) + (msg.message.length > 200 ? '...' : ''),
                            type: 'agent',
                            link: msg.workflow_id
                                ? `/flow-builder?id=${msg.workflow_id}`
                                : '/flow-builder'
                        });
                    }

                    // Mark as sent
                    await supabase
                        .from('rune_pending_messages')
                        .update({ sent_at: new Date().toISOString() })
                        .eq('id', msg.id);

                    return { success: true, id: msg.id };
                } catch (e: any) {
                    console.error(`[Notifications] Failed to process message ${msg.id}:`, e);
                    return { success: false, id: msg.id, error: e.message };
                }
            })
        );

        const success = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failed = results.length - success;

        return NextResponse.json({
            processed: results.length,
            success,
            failed,
            message: `Processed ${results.length} notifications`
        });

    } catch (error: any) {
        console.error('[Notifications] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
