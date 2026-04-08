import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { createAdminClient } from '@/lib/supabase/server';
import { AgentEventInsert } from '@/lib/types/database';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ingests an event for the autonomous agent system.
 * Handles deduplication automatically via the database unique constraint on dedupe_key.
 */
export async function ingestAutonomyEvent(
    userId: string,
    event: Omit<AgentEventInsert, 'id' | 'created_at' | 'user_id' | 'status'>,
    supabaseClient?: SupabaseClient
) {
    let supabase: any = supabaseClient;
    if (!supabase || typeof supabase.from !== 'function') {
        try {
            supabase = await createClient();
        } catch {
            try {
                // Fallback for non-request contexts (cron/workers/tests).
                supabase = createAdminClient();
            } catch {
                // Local/test environments may not expose service role keys.
                return { event: null, deduplicated: false };
            }
        }
    }

    // Default to a random UUID if no dedupe key provided (though type requires it)
    const dedupeKey = event.dedupe_key || crypto.randomUUID();

    const payload: AgentEventInsert = {
        ...event,
        user_id: userId,
        dedupe_key: dedupeKey,
        status: 'pending'
    };

    // @ts-ignore - Supabase type inference issue with insert
    const { data, error } = await supabase
        .from('rune_agent_events')
        .insert(payload)
        .select()
        .single();

    if (error) {
        // Check for unique constraint violation (deduplication)
        if (error.code === '23505') { // Postgres code for unique_violation
            console.log(`[Autonomy] Deduplicated event ${dedupeKey}`);

            // Fetch the existing event to return it
            const { data: existing } = await supabase
                .from('rune_agent_events')
                .select()
                .eq('dedupe_key', dedupeKey)
                .single();

            return { event: existing, deduplicated: true };
        }

        console.error('[Autonomy] Failed to ingest event:', error);
        throw error;
    }

    return { event: data, deduplicated: false };
}
