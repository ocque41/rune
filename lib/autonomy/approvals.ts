import { createAdminClient } from '@/lib/supabase/server';
import { randomBytes, createHash } from 'crypto';
import { executeJob } from '@/lib/autonomy/execution';

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

export async function applyApprovalToken(token: string): Promise<{
    ok: boolean;
    alreadyUsed?: boolean;
    error?: string;
    jobId?: string;
    action?: 'approve' | 'reject';
}> {
    const validation = await validateApprovalToken(token);
    if (!validation.valid || !validation.jobId || !validation.action) {
        return {
            ok: false,
            alreadyUsed: validation.alreadyUsed,
            error: validation.alreadyUsed ? 'Token already used' : 'Invalid or expired token'
        };
    }

    const supabase = createAdminClient();
    const decision = validation.action === 'reject' ? 'rejected' : 'approved';
    const status = decision === 'approved' ? 'pending' : 'cancelled';

    const { data: job, error: jobError } = await supabase
        .from('rune_agent_jobs')
        .select('id, status')
        .eq('id', validation.jobId)
        .single();

    if (jobError || !job) {
        return { ok: false, error: 'Job not found' };
    }

    if (job.status !== 'waiting_approval') {
        return { ok: false, error: `Job is not awaiting approval (status: ${job.status})` };
    }

    const { error: updateError } = await supabase
        .from('rune_agent_jobs')
        .update({
            status,
            approval_responded_at: new Date().toISOString(),
            approval_response: { decision, by: 'token_link' }
        } as any)
        .eq('id', validation.jobId);

    if (updateError) {
        return { ok: false, error: updateError.message };
    }

    await markTokenUsed(token);

    if (decision === 'approved') {
        try {
            await executeJob(validation.jobId, supabase as any);
        } catch (e: any) {
            return { ok: false, error: `Approved, but execution trigger failed: ${e.message}` };
        }
    }

    return {
        ok: true,
        jobId: validation.jobId,
        action: validation.action as 'approve' | 'reject'
    };
}
