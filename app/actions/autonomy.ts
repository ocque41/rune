'use server';

import { createClient } from '@/lib/supabase/server';
import { executeJob } from '@/lib/autonomy/execution';
import { revalidatePath } from 'next/cache';
import { AutonomyConfig } from '@/lib/autonomy/policy';

export async function getAutonomyJobs(limit = 20) {
    const supabase = await createClient();
    const { data: jobs, error } = await supabase
        .from('rune_agent_jobs')
        .select(`
            *,
            rune_agent_events (
                source_type,
                payload
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(error.message);
    return jobs;
}

export async function getAutonomyJob(jobId: string) {
    const supabase = await createClient();
    const { data: job, error } = await supabase
        .from('rune_agent_jobs')
        .select(`
            *,
            rune_agent_events (*),
            rune_agent_decisions (*)
        `)
        .eq('id', jobId)
        .single();

    if (error) throw new Error(error.message);
    return job;
}

export async function getAutonomyPolicy(workflowId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    let query = supabase.from('rune_autonomy_policies').select('*').eq('user_id', user.id);

    if (workflowId) {
        query = query.eq('workflow_id', workflowId);
    } else {
        query = query.is('workflow_id', null);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // Ignore not found
        throw new Error(error.message);
    }

    return data?.policy as AutonomyConfig | null;
}

export async function updateAutonomyPolicy(config: AutonomyConfig, workflowId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const payload = {
        user_id: user.id,
        workflow_id: workflowId || null,
        policy: config,
        updated_at: new Date().toISOString()
    };

    // Upsert logic
    const { error } = await supabase
        .from('rune_autonomy_policies')
        .upsert(payload as any, { onConflict: 'user_id, workflow_id' });

    if (error) throw new Error(error.message);

    revalidatePath('/autonomy'); // Revalidate if we have a page there
}

export async function approveJob(jobId: string, decision: 'approved' | 'rejected' = 'approved') {
    const supabase = await createClient();

    // 1. Verify Job is waiting
    const { data: job, error } = await supabase
        .from('rune_agent_jobs')
        .select('status')
        .eq('id', jobId)
        .single();

    if (error || !job) throw new Error('Job not found');
    if (job.status !== 'waiting_approval') throw new Error('Job is not waiting for approval');

    // 2. Update Status
    const newStatus = decision === 'approved' ? 'pending' : 'cancelled';

    const { error: updateError } = await supabase
        .from('rune_agent_jobs')
        .update({
            status: newStatus,
            approval_responded_at: new Date().toISOString(),
            approval_response: { decision, by: 'user' }
        } as any)
        .eq('id', jobId);

    if (updateError) throw new Error(updateError.message);

    // 3. Trigger Execution Immediately (if approved)
    if (decision === 'approved') {
        try {
            await executeJob(jobId, supabase);
        } catch (e) {
            console.error('Immediate execution trigger failed:', e);
        }
    }

    revalidatePath('/');
}

export async function rejectJob(jobId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('rune_agent_jobs')
        .update({
            status: 'cancelled',
            approval_responded_at: new Date().toISOString(),
            approval_response: { decision: 'rejected', by: 'user' }
        } as any)
        .eq('id', jobId);

    if (error) throw new Error(error.message);
    revalidatePath('/');
}
