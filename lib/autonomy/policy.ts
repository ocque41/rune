import { SupabaseClient } from '@supabase/supabase-js';
import { Database, AutonomyPolicyConfig, BudgetUsage } from '@/lib/types/database';

export type AutonomyConfig = AutonomyPolicyConfig;

export const SYSTEM_DEFAULT_POLICY: AutonomyPolicyConfig = {
    mode: 'OFF',
    maxActionsPerHour: 10,
    maxActionsPerDay: 50,
    maxTokensPerHour: 100000,
    maxTokensPerDay: 500000,
    maxParallelJobs: 3,
    toolAllowlist: [],
    toolBlocklist: [],
    triggersEnabled: {
        webhook: false,
        schedule: false,
        runCompletion: false,
        manualOnly: true
    },
    notifyOnSuccess: false,
    notifyOnFailure: true,
    notifyOnApprovalNeeded: true
};

/**
 * Resolves the effective policy for a user/workflow combination.
 * Hierarchy: Workflow Specific > User Default > System Default
 */
export async function getEffectivePolicy(
    supabase: SupabaseClient<Database>,
    userId: string,
    workflowId?: string
): Promise<{ config: AutonomyPolicyConfig; source: 'workflow' | 'user' | 'system' }> {
    // Fetch both user default and workflow specific policies
    const { data: policies } = await supabase
        .from('rune_autonomy_policies')
        .select('*')
        .eq('user_id', userId)
        .or(`workflow_id.is.null${workflowId ? `,workflow_id.eq.${workflowId}` : ''}`);

    if (!policies || policies.length === 0) {
        return { config: SYSTEM_DEFAULT_POLICY, source: 'system' };
    }

    // Check for workflow specific override
    // Check for workflow specific override
    const policiesAny = policies as any[];
    const workflowPolicy = workflowId ? policiesAny.find((p: any) => p.workflow_id === workflowId) : undefined;
    if (workflowPolicy) {
        return { config: workflowPolicy.policy as unknown as AutonomyPolicyConfig, source: 'workflow' };
    }

    // Check for user default
    // Check for user default
    const userPolicy = policiesAny.find((p: any) => p.workflow_id === null);
    if (userPolicy) {
        return { config: userPolicy.policy as unknown as AutonomyPolicyConfig, source: 'user' };
    }

    return { config: SYSTEM_DEFAULT_POLICY, source: 'system' };
}

/**
 * Checks if the user has sufficient budget for a new action/job.
 * Returns true if allowed, false if budget exceeded.
 */
export async function checkBudget(
    supabase: SupabaseClient<Database>,
    userId: string,
    policy: AutonomyPolicyConfig,
    estimatedTokens: number = 0
): Promise<{ allowed: boolean; reason?: string }> {
    const { data: usage, error } = await supabase
        .from('rune_autonomy_budget_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error || !usage) {
        // If no usage record (view might return empty if no jobs), treat as zero usage
        // But better to be safe. If error, fail open or closed? 
        // Failing closed (deny) is safer for budget.
        if (error && error.code !== 'PGRST116') { // PGRST116 = JSON object requested, multiple (or no) rows returned
            console.error('[Autonomy] Failed to fetch budget usage:', error);
            return { allowed: false, reason: 'Budget check failed system error' };
        }
    }

    const current = usage || {
        user_id: userId,
        actions_last_hour: 0,
        actions_last_day: 0,
        tokens_last_hour: 0,
        tokens_last_day: 0,
        jobs_running: 0
    } as BudgetUsage;

    // 1. Check Parallel Jobs (running)
    // Note: We are starting a NEW job, so strictly strictly > vs >= depends on if current job is counted. 
    // Usually 'jobs_running' + 1 <= max
    if (current.jobs_running >= policy.maxParallelJobs) {
        return { allowed: false, reason: `Max parallel jobs exceeded (${current.jobs_running}/${policy.maxParallelJobs})` };
    }

    // 2. Check Actions (Frequency)
    if (current.actions_last_hour >= policy.maxActionsPerHour) {
        return { allowed: false, reason: `Hourly action limit exceeded (${current.actions_last_hour}/${policy.maxActionsPerHour})` };
    }
    if (current.actions_last_day >= policy.maxActionsPerDay) {
        return { allowed: false, reason: `Daily action limit exceeded (${current.actions_last_day}/${policy.maxActionsPerDay})` };
    }

    // 3. Check Tokens (Cost)
    if (current.tokens_last_hour + estimatedTokens > policy.maxTokensPerHour) {
        return { allowed: false, reason: `Hourly token limit exceeded` };
    }
    if (current.tokens_last_day + estimatedTokens > policy.maxTokensPerDay) {
        return { allowed: false, reason: `Daily token limit exceeded` };
    }

    return { allowed: true };
}
