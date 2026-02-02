import { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

export async function processPendingMessages(
  supabase: SupabaseClient,
  params: { messageId?: string; limit?: number } = {}
) {
  const { messageId, limit = 50 } = params;

  let query = supabase
    .from('rune_pending_messages')
    .select(
      `
        *,
        users:user_id (
          id,
          email,
          raw_user_meta_data
        )
      `
    )
    .is('sent_at', null)
    .lte('scheduled_for', new Date().toISOString());

  if (messageId) {
    query = query.eq('id', messageId);
  }

  const { data: pendingMessages, error } = await query.limit(limit);

  if (error) {
    console.error('[Notifications] Query error:', error);
    throw new Error(error.message);
  }

  if (!pendingMessages || pendingMessages.length === 0) {
    return { processed: 0, success: 0, failed: 0, message: 'No pending messages' };
  }

  console.log(`[Notifications] Processing ${pendingMessages.length} message(s)`);

  const results = await Promise.allSettled(
    pendingMessages.map(async (msg: any) => {
      try {
        const { data: prefs } = await supabase
          .from('rune_notification_preferences')
          .select('*')
          .eq('user_id', msg.user_id)
          .single();

        const emailEnabled = prefs?.email_enabled ?? true;
        const userEmail = prefs?.email_address || msg.users?.email;

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

        if (msg.chat_id) {
          await supabase.from('rune_chat_messages').insert({
            chat_id: msg.chat_id,
            role: 'assistant',
            content: msg.message
          });
        }

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

  return {
    processed: results.length,
    success,
    failed,
    message: `Processed ${results.length} notifications`
  };
}
