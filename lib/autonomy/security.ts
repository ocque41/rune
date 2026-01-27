import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies the HMAC-SHA256 signature of a request payload.
 * 
 * @param payload - The raw JSON body or stringified payload
 * @param secret - The distinct webhook_secret for the workflow
 * @param signature - The signature from X-Rune-Signature header
 * @returns boolean - True if valid
 */
export function verifySignature(payload: any, secret: string, signature: string): boolean {
    if (!signature || !secret) return false;

    // Ensure payload is string
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Calculate HMAC
    const hmac = createHmac('sha256', secret);
    hmac.update(data);
    const calculated = hmac.digest('hex');

    // Constant-time comparison to prevent timing attacks
    // signatures might be different lengths, preventing direct buffer compare
    if (calculated.length !== signature.length) {
        return false;
    }

    const a = Buffer.from(calculated);
    const b = Buffer.from(signature);

    return timingSafeEqual(a, b);
}
