import { createClient } from '@/lib/supabase/server';
import { getPlanFromTier, PLAN_LIMITS, PlanLimits } from './plans';

export interface UserEntitlement {
    tier: string;
    limits: PlanLimits;
    usage: {
        current_monthly_cost: number;
        cost_usage_percent: number;
        is_over_limit: boolean;
    };
}

export async function getUserEntitlements(userId: string): Promise<UserEntitlement> {
    const supabase = await createClient();

    // 1. Get User Profile for Tier
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', userId)
        .single();

    // Default to free if error or missing
    const tier = profile?.tier || 'free';
    const planTier = getPlanFromTier(tier);
    const limits = PLAN_LIMITS[planTier];

    // 2. Get Current Monthly Usage (Approximate from Rollup)
    // We sum up cost from the first of the current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: usageData, error: usageError } = await supabase
        .from('rune_agent_usage_daily_rollup')
        .select('estimated_cost_usd')
        .eq('user_id', userId)
        .gte('day', firstDay);

    let totalCost = 0;
    if (usageData) {
        totalCost = usageData.reduce((acc, curr) => acc + (Number(curr.estimated_cost_usd) || 0), 0);
    }

    // Add today's "live" usage (optional, but good for accuracy)
    // We'll skip for now to avoid double read cost, assuming rollup runs nightly.
    // Ideally we'd sum today's raw events too.

    return {
        tier: planTier,
        limits,
        usage: {
            current_monthly_cost: totalCost,
            cost_usage_percent: (totalCost / limits.max_monthly_cost_usd) * 100,
            is_over_limit: totalCost >= limits.max_monthly_cost_usd
        }
    };
}
