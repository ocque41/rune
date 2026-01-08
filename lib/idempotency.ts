import { createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface IdempotencyConfig {
    key: string;
    scope: string;
    userId?: string; // Optional user ID if auth context available
    params?: any; // For request verification
}

/**
 * processIdempotency
 * Wraps an operation with idempotency checks.
 * 
 * 1. Checks if key exists.
 * 2. If 'completed', returns cached response.
 * 3. If 'pending'/'processing', waits or throws conflict (simple retry-after).
 * 4. If new, inserts key 'processing' and runs handler.
 * 5. On success, updates to 'completed' with response.
 * 6. On error, updates to 'failed'.
 */
export async function processIdempotency(
    config: IdempotencyConfig,
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    const supabase = createAdminClient();
    const { key, scope, userId, params } = config;

    // 1. Try to insert 'processing' record
    // If conflict, fetching existing
    const { error: insertError } = await supabase
        .from('rune_idempotency_keys')
        .insert({
            key,
            scope,
            user_id: userId || null,
            status: 'processing',
            request_params: params,
            created_at: new Date().toISOString()
        });

    if (insertError) {
        if (insertError.code === '23505') { // Unique violation
            // Key exists, fetch it
            const { data: existing, error: fetchError } = await supabase
                .from('rune_idempotency_keys')
                .select('*')
                .eq('key', key)
                .eq('scope', scope)
                .single();

            if (fetchError || !existing) {
                // Should not happen if constraint violation occurred
                return NextResponse.json({ error: 'Idempotency check failed' }, { status: 500 });
            }

            if (existing.status === 'completed' && existing.response_body) {
                // Return cached response
                // Note: We reconstruct NextResponse from JSON
                return NextResponse.json(existing.response_body);
            }

            if (existing.status === 'processing') {
                // Concurrent request
                return NextResponse.json(
                    { error: 'Request is already being processed' },
                    { status: 409, headers: { 'Retry-After': '5' } }
                );
            }

            if (existing.status === 'failed') {
                // Allow retrying if failed? Or return previous error?
                // Usually we might auto-cleanup failed keys or allow overwrite.
                // For now, return the previous error.
                return NextResponse.json(
                    { error: 'Previous request failed', code: existing.error_message },
                    { status: 422 }
                );
            }
        }
        throw insertError;
    }

    // 2. Run Handler
    try {
        const response = await handler();

        // 3. Cache Success
        // Only cache if status is 2xx
        if (response.status >= 200 && response.status < 300) {
            const responseData = await response.clone().json().catch(() => ({}));

            await supabase
                .from('rune_idempotency_keys')
                .update({
                    status: 'completed',
                    response_body: responseData
                })
                .eq('key', key)
                .eq('scope', scope);
        } else {
            // Mark as failed or simply delete to allow retry?
            // Marking failed prevents infinite retry loops if logic is broken
            await supabase
                .from('rune_idempotency_keys')
                .update({
                    status: 'failed',
                    error_message: `Status ${response.status}`
                })
                .eq('key', key)
                .eq('scope', scope);
        }

        return response;

    } catch (error: any) {
        // 4. Handle Error
        await supabase
            .from('rune_idempotency_keys')
            .update({
                status: 'failed',
                error_message: error.message
            })
            .eq('key', key)
            .eq('scope', scope);

        throw error;
    }
}
