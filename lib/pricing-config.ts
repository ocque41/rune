export interface PricingModel {
    inputCostPer1M: number;
    outputCostPer1M: number;
}

// Current pricing as of Jan 2025 (Approximation for Preview/Prod)
export const PRICING_MAP: Record<string, PricingModel> = {
    // Gemini 3.0 Pro
    'gemini-3.0-pro-preview': { inputCostPer1M: 1.25, outputCostPer1M: 5.00 }, // Placeholder optimized
    'gemini-3.0-flash-preview': { inputCostPer1M: 0.10, outputCostPer1M: 0.40 },

    // Gemini 1.5 Pro (Fallback)
    'gemini-1.5-pro': { inputCostPer1M: 1.25, outputCostPer1M: 5.00 },
    'gemini-1.5-flash': { inputCostPer1M: 0.075, outputCostPer1M: 0.30 },

    // Default
    'default': { inputCostPer1M: 1.00, outputCostPer1M: 3.00 }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const rate = PRICING_MAP[model] || PRICING_MAP['default'];
    const inputCost = (inputTokens / 1_000_000) * rate.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * rate.outputCostPer1M;
    return inputCost + outputCost;
}
