import { createClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database';
import { getEffectivePolicy, checkBudget } from './policy';
import { executeTool } from '@/lib/agent/executor';

export async function executeJob(jobId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || await createClient();

    // 1. Fetch Job
    const { data: jobData, error } = await supabase
        .from('rune_agent_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

    // @ts-ignore
    const job = jobData as any;

    if (error || !job) {
        console.error(`[Execution] Job ${jobId} not found`);
        return;
    }

    if (job.status !== 'pending' && job.status !== 'running') {
        // Only execute pending/running
        return;
    }

    // Mark as running if not already
    if (job.status === 'pending') {
        // @ts-ignore
        (supabase.from('rune_agent_jobs') as any)
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', jobId);
    }

    const plan = job.plan as any; // { steps: [] }
    if (!plan || !Array.isArray(plan.steps)) {
        console.error(`[Execution] Invalid plan for job ${jobId}`);
        await updateJobStatus(supabase, jobId, 'failed', { error: 'Invalid plan structure' });
        return;
    }

    // 2. Policy & Budget
    const { config: policy } = await getEffectivePolicy(supabase, job.user_id, job.workflow_id || undefined);

    let allCompleted = true;
    let stepsExecutedThisRun = 0;
    const MAX_STEPS_PER_BATCH = 5; // Prevent timeout in cron/lambda

    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];

        if (step.status === 'completed') continue;

        if (stepsExecutedThisRun >= MAX_STEPS_PER_BATCH) {
            allCompleted = false;
            // Yield for next run: Release lease so it can be picked up immediately
            await updateJobStatus(supabase, jobId, 'running', { leased_until: null });
            break;
        }

        // 3. Check Policy (Allowlist/Blocklist)
        if (policy.toolAllowlist && policy.toolAllowlist.length > 0) {
            if (!policy.toolAllowlist.includes(step.tool)) {
                console.warn(`[Execution] Tool usage denied by allowlist: ${step.tool}`);
                await updateJobStatus(supabase, jobId, 'failed', { error: `Tool denied by policy: ${step.tool}` });
                return;
            }
        }
        if (policy.toolBlocklist && policy.toolBlocklist.includes(step.tool)) {
            console.warn(`[Execution] Tool usage denied by blocklist: ${step.tool}`);
            await updateJobStatus(supabase, jobId, 'failed', { error: `Tool blocked by policy: ${step.tool}` });
            return;
        }

        // 4. Check Budget
        const estimatedCost = 0; // Tools don't have explicit cost yet
        const budget = await checkBudget(supabase, job.user_id, policy, estimatedCost);

        if (!budget.allowed) {
            console.warn(`[Execution] Budget exceeded for job ${jobId}: ${budget.reason}`);
            await updateJobStatus(supabase, jobId, 'paused', { reason: budget.reason });
            return;
        }

        // 4. Execute Step
        console.log(`[Execution] Job ${jobId} Step ${i}: ${step.tool}`);
        try {
            const result = await executeTool(
                supabase,
                job.user_id,
                step.tool,
                step.args,
                { jobId: job.id, stepId: i.toString(), workflowId: job.workflow_id }
            );

            // Update Step Result
            step.status = 'completed';
            step.result = result;
            step.executed_at = new Date().toISOString();

            // Update Job Plan in DB (Persistence)
            // @ts-ignore
            await (supabase.from('rune_agent_jobs') as any).update({ plan: plan }).eq('id', jobId);

            stepsExecutedThisRun++;

            if (result.error) {
                console.warn(`[Execution] Step failed: ${result.error}`);
                step.status = 'failed';
                await updateJobStatus(supabase, jobId, 'paused', { reason: `Step ${i} failed: ${result.error}` });
                return;
            }

        } catch (e: any) {
            console.error(`[Execution] Step exception`, e);
            await updateJobStatus(supabase, jobId, 'failed', { error: e.message });
            return;
        }
    }

    // 5. Completion
    if (allCompleted) {
        await updateJobStatus(supabase, jobId, 'completed');
    }
}

async function updateJobStatus(supabase: any, jobId: string, status: string, resultUpdate: any = {}) {
    const updatePayload: any = {
        status,
        result: resultUpdate,
        updated_at: new Date().toISOString(),
    };

    if (status === 'completed' || status === 'failed') {
        updatePayload.completed_at = new Date().toISOString();
    }

    // @ts-ignore
    await supabase.from('rune_agent_jobs').update(updatePayload).eq('id', jobId);
}
