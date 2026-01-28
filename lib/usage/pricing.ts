export const GEMINI_PRICING = {
    'gemini-1.5-flash': {
        inputCostPer1M: 0.10,
        outputCostPer1M: 0.40,
        cacheStoragePer1MPerHour: 1.00, // Estimate based on public docs
    },
    'gemini-1.5-pro': {
        inputCostPer1M: 1.25,
        outputCostPer1M: 5.00,
        cacheStoragePer1MPerHour: 4.50, // Estimate
    },
    'default': {
        inputCostPer1M: 0.00,
        outputCostPer1M: 0.00,
        cacheStoragePer1MPerHour: 0.00,
    }
};

export interface CostParams {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cachedTokens?: number;
}

export function calculateEstimatedCost(params: CostParams): number {
    const modelKey = Object.keys(GEMINI_PRICING).find(k => params.model.includes(k)) || 'default';
    const pricing = GEMINI_PRICING[modelKey as keyof typeof GEMINI_PRICING];

    // Basic calculation: (Input / 1M * Price) + (Output / 1M * Price)
    // Note: We are treating cached tokens as free or reduced cost is model specific,
    // but for simplicity/conservatism we often treat them as input tokens unless we have precise cache hit pricing.
    // Gemini 1.5 Flash cache hits are significantly cheaper (~25% of input cost), but let's stick to base input cost 
    // until we have distinct cache pricing in the map.
    // UPDATE: Flash cache hit is ~$0.02 vs $0.075. We will assume standard input for now to be conservative/upper-bound.

    const inputCost = (params.inputTokens / 1_000_000) * pricing.inputCostPer1M;
    const outputCost = (params.outputTokens / 1_000_000) * pricing.outputCostPer1M;

    return inputCost + outputCost;
}
