import { getUserEntitlements } from '@/lib/autonomy/entitlements';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';

export interface PlanDetails {
    plan_id: string; // 'free', 'pro', 'enterprise'
    plan_name: string;
    monthly_allowance_usd: number;
    current_period: {
        start: string; // ISO date
        end: string; // ISO date
    };
    usage: {
        total_usd: number;
        percent: number;
        remaining_usd: number;
        is_over_limit: boolean;
    };
    limits: {
        max_requests_per_day: number;
        max_concurrent_jobs: number;
        features: {
            autonomy: boolean;
            analytics: boolean;
            custom_tools: boolean;
        };
    };
}

export async function getUserPlan(userId: string): Promise<PlanDetails> {
    const entitlements = await getUserEntitlements(userId);

    // Calculate period (First day of month to Last day of month)
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const totalCost = entitlements.usage.current_monthly_cost;
    const maxCost = entitlements.limits.max_monthly_cost_usd;
    const remaining = Math.max(0, maxCost - totalCost);

    return {
        plan_id: entitlements.tier,
        plan_name: entitlements.tier.charAt(0).toUpperCase() + entitlements.tier.slice(1),
        monthly_allowance_usd: maxCost,
        current_period: {
            start: start.toISOString(),
            end: end.toISOString()
        },
        usage: {
            total_usd: totalCost,
            percent: entitlements.usage.cost_usage_percent,
            remaining_usd: remaining,
            is_over_limit: entitlements.usage.is_over_limit
        },
        limits: entitlements.limits
    };
}
