import { estimateCost } from '../../lib/billing/gemini-pricing';
import assert from 'assert';

console.log('Running Gemini Pricing Tests...');

// Test 1: Gemini 1.5 Flash
const cost1 = estimateCost('gemini-1.5-flash', {
    prompt_tokens: 1_000_000,
    output_tokens: 1_000_000
});
// Input: 0.075, Output: 0.30 => Total: 0.375
console.log(`Flash 1.5 (1M/1M): $${cost1} (Expected: 0.375)`);
assert.ok(Math.abs(cost1 - 0.375) < 0.0001, 'Flash 1.5 pricing incorrect');

// Test 2: Gemini 1.5 Pro
const cost2 = estimateCost('gemini-1.5-pro', {
    prompt_tokens: 1_000_000,
    output_tokens: 1_000_000
});
// Input: 1.25, Output: 5.00 => Total: 6.25
console.log(`Pro 1.5 (1M/1M): $${cost2} (Expected: 6.25)`);
assert.ok(Math.abs(cost2 - 6.25) < 0.0001, 'Pro 1.5 pricing incorrect');

// Test 3: Caching
const cost3 = estimateCost('gemini-1.5-flash', {
    prompt_tokens: 0,
    output_tokens: 0,
    cached_tokens: 1_000_000
});
// Cache Read: 0.018 => Total: 0.018
console.log(`Flash 1.5 Cache (1M): $${cost3} (Expected: 0.018)`);
assert.ok(Math.abs(cost3 - 0.018) < 0.0001, 'Flash cache pricing incorrect');

// Test 4: Unknown model fallback
const cost4 = estimateCost('unknown-model', {
    prompt_tokens: 1_000_000,
    output_tokens: 1_000_000
});
// Should fall back to Flash 1.5 or Default?
// My code: defaults to 'gemini-1.5-flash' if not found in normalized check, 
// OR 'DEFAULT_RATE' (1.0/4.0) if explicitly checking key.
// Code: `const normalizedModel = Object.keys(GEMINI_PRICING).find(k => model.includes(k)) || 'gemini-1.5-flash';`
// So 'unknown-model' becomes 'gemini-1.5-flash'.
console.log(`Unknown Model (Fallback to Flash): $${cost4} (Expected: 0.375)`);
assert.ok(Math.abs(cost4 - 0.375) < 0.0001, 'Fallback pricing incorrect');

console.log('All tests passed!');
