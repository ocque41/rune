export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
    max_monthly_cost_usd: number;
    max_requests_per_day: number;
    max_concurrent_jobs: number;
    features: {
        autonomy: boolean;
        analytics: boolean;
        custom_tools: boolean;
    };
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
    free: {
        max_monthly_cost_usd: 5.00,
        max_requests_per_day: 50,
        max_concurrent_jobs: 1,
        features: {
            autonomy: false,
            analytics: false,
            custom_tools: false
        }
    },
    pro: {
        max_monthly_cost_usd: 50.00,
        max_requests_per_day: 1000,
        max_concurrent_jobs: 5,
        features: {
            autonomy: true,
            analytics: true,
            custom_tools: true
        }
    },
    enterprise: {
        max_monthly_cost_usd: 500.00,
        max_requests_per_day: 10000,
        max_concurrent_jobs: 20,
        features: {
            autonomy: true,
            analytics: true,
            custom_tools: true
        }
    }
};

export function getPlanFromTier(tier: string | null): PlanTier {
    if (!tier) return 'free';
    const normalized = tier.toLowerCase();
    if (normalized.includes('pro')) return 'pro';
    if (normalized.includes('ent')) return 'enterprise';
    return 'free';
}
