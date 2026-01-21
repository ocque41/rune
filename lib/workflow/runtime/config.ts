/**
 * Runtime Configuration for Workflow Execution
 * 
 * Manages environment detection and mode-based behavior for workflow steps.
 */

export type RuntimeMode = 'sandbox' | 'prod-pre-db' | 'production';

/**
 * Get the current runtime mode from environment
 * 
 * - sandbox: All external calls mocked, deterministic results
 * - prod-pre-db: Real HTTP/Slack/AI calls if configured, DB always mocked
 * - production: Full production mode (requires real DB configuration)
 */
export function getRuntimeMode(): RuntimeMode {
    const mode = process.env.RUNE_WORKFLOW_MODE;

    if (mode === 'production') {
        // Production mode requires database to be configured
        // Until real DB integration exists, warn and fallback to prod-pre-db
        if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
            console.warn('[Runtime] RUNE_WORKFLOW_MODE=production but no DATABASE_URL configured. Falling back to prod-pre-db mode.');
            return 'prod-pre-db';
        }
        return 'production';
    }

    if (mode === 'sandbox' || mode === 'prod-pre-db') {
        return mode;
    }

    // Default based on NODE_ENV
    return process.env.NODE_ENV === 'production' ? 'prod-pre-db' : 'sandbox';
}


/**
 * Check if running in sandbox mode (mocks preferred)
 */
export function isSandboxMode(): boolean {
    return getRuntimeMode() === 'sandbox';
}

/**
 * Check if running in production mode (real services)
 */
export function isProductionMode(): boolean {
    return getRuntimeMode() === 'production';
}

/**
 * Check if a specific service is configured via environment variables
 */
export function isServiceConfigured(service: 'database' | 'email' | 'slack' | 'openai' | 'gemini'): boolean {
    switch (service) {
        case 'database':
            return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.MYSQL_URL || process.env.MONGODB_URL);
        case 'email':
            return !!(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.SENDGRID_API_KEY);
        case 'slack':
            return !!process.env.SLACK_WEBHOOK_URL;
        case 'gemini':
            return !!process.env.GEMINI_API_KEY;
        default:
            return false;
    }
}

/**
 * Check if real database queries are allowed.
 * 
 * In pre-DB development, this returns false even if connection strings are present.
 * Set RUNE_ALLOW_REAL_DB=true to enable real database queries.
 * 
 * This is a safety guard to prevent accidental real DB operations during development.
 */
export function isDbAllowed(): boolean {
    // Explicit flag must be set to true
    if (process.env.RUNE_ALLOW_REAL_DB !== 'true') {
        return false;
    }
    // Also need actual DB configuration
    return isServiceConfigured('database');
}

/**
 * Get environment variable with optional default
 */
export function getEnvVar(name: string, defaultValue?: string): string | undefined {
    return process.env[name] ?? defaultValue;
}

/**
 * Get required environment variable or throw
 */
export function requireEnvVar(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}

/**
 * Maximum allowed sleep duration to prevent runaway delays
 */
export const MAX_SLEEP_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Default timeout for HTTP requests
 */
export const DEFAULT_HTTP_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Maximum script execution time
 */
export const MAX_SCRIPT_EXECUTION_MS = 10_000; // 10 seconds

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    baseDelayMs: 1000,
    backoffPolicy: 'exponential' as const,
};
