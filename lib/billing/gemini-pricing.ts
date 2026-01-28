export type ModelName = 'gemini-1.5-flash' | 'gemini-1.5-pro' | 'gemini-2.0-flash-exp' | string;

export interface PricingRate {
    input_per_million: number;
    output_per_million: number;
    cache_read_per_million?: number; // Cheaper than input
}

// Pricing as of Jan 2026 (Projected/Estimated based on late 2025 data + research)
// Source: https://ai.google.dev/pricing
export const GEMINI_PRICING: Record<string, PricingRate> = {
    // Flash 1.5: $0.075 / 1M input, $0.30 / 1M output
    'gemini-1.5-flash': {
        input_per_million: 0.075,
        output_per_million: 0.3,
        cache_read_per_million: 0.018, // ~25% of input usually, or less
    },
    'gemini-1.5-flash-latest': {
        input_per_million: 0.075,
        output_per_million: 0.3,
        cache_read_per_million: 0.018,
    },
    // Pro 1.5: $1.25 / 1M input, $5.00 / 1M output (<128k context)
    // Simplified for estimation
    'gemini-1.5-pro': {
        input_per_million: 1.25,
        output_per_million: 5.00,
        cache_read_per_million: 0.3125,
    },
    'gemini-1.5-pro-latest': {
        input_per_million: 1.25,
        output_per_million: 5.00,
        cache_read_per_million: 0.3125,
    },
    // Gemini 2.0 (Estimated)
    'gemini-2.0-flash': {
        input_per_million: 0.10,
        output_per_million: 0.40,
        cache_read_per_million: 0.025,
    },
    'gemini-2.0-flash-exp': {
        input_per_million: 0.0, // Often free in preview? Assuming paid for safety.
        output_per_million: 0.0,
        cache_read_per_million: 0.0,
    }
};

export const DEFAULT_RATE: PricingRate = {
    input_per_million: 1.0, // Fallback conservative
    output_per_million: 4.0,
};

export interface Usage {
    prompt_tokens: number;
    output_tokens: number;
    cached_tokens?: number; // Tokens read from cache
    reasoning_tokens?: number; // Usually included in output_tokens by API, but if broken out we treat as output
}

export function estimateCost(model: string, usage: Usage): number {
    // Normalize model name
    const normalizedModel = Object.keys(GEMINI_PRICING).find(k => model.includes(k)) || 'gemini-1.5-flash';
    const rate = GEMINI_PRICING[normalizedModel] || DEFAULT_RATE;

    // Reasoning tokens are part of output tokens in Gemini 2.0 Flash Thinking, 
    // but if passed separately, add them to output.
    // Note: usage.output_tokens should normally INCLUDE reasoning_tokens from the API.
    const effectiveOutputTokens = usage.output_tokens;

    const inputCost = (usage.prompt_tokens / 1_000_000) * rate.input_per_million;
    const outputCost = (effectiveOutputTokens / 1_000_000) * rate.output_per_million;

    let cacheCost = 0;
    if (usage.cached_tokens && rate.cache_read_per_million) {
        cacheCost = (usage.cached_tokens / 1_000_000) * rate.cache_read_per_million;
    }

    // Cost is usually small, so we might want to return high precision
    return inputCost + outputCost + cacheCost;
}
