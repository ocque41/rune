import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes, createHash } from 'crypto';

export async function generateApprovalToken(jobId: string, action: 'approve' | 'reject' = 'approve'): Promise<string> {
    const supabase = createAdminClient();
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // Check if there is already an unused token for this job/action? 
    // Usually valid to have multiple links sent (re-sends).

    const { error } = await supabase
        .from('rune_approval_tokens')
        .insert({
            token_hash: tokenHash,
            job_id: jobId,
            action: action
        });

    if (error) throw new Error(`Failed to generate token: ${error.message}`);

    // Return the RAW token to be emailed. Never store it.
    return token;
}

export async function validateApprovalToken(token: string): Promise<{ valid: boolean; jobId?: string; action?: string; alreadyUsed?: boolean }> {
    if (!token) return { valid: false };

    const supabase = createAdminClient();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    // 1. Fetch Token by Hash
    const { data: tokenRecord, error } = await supabase
        .from('rune_approval_tokens')
        .select('*')
        .eq('token_hash', tokenHash)
        .single();

    if (error || !tokenRecord) {
        return { valid: false };
    }

    // 2. Check Expiry
    if (new Date(tokenRecord.expires_at) < new Date()) {
        return { valid: false };
    }

    // 3. Check Usage
    if (tokenRecord.used_at) {
        return { valid: false, alreadyUsed: true };
    }

    return { valid: true, jobId: tokenRecord.job_id, action: tokenRecord.action };
}

export async function markTokenUsed(token: string) {
    const supabase = createAdminClient();
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await supabase
        .from('rune_approval_tokens')
        .update({ used_at: new Date().toISOString() } as any)
        .eq('token_hash', tokenHash);
}
