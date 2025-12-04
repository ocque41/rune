
// Mock helper functions from workflow-generator.ts
function parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(ms|s|m|h)$/);
    if (!match) return 1000; // Default to 1 second
    const [, num, unit] = match;
    const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000 };
    return parseInt(num) * (multipliers[unit] || 1000);
}

function calculateBackoff(attempt: number, policy: string, baseDelay: string): number {
    const baseMs = parseDuration(baseDelay);
    switch (policy) {
        case 'exponential':
            return Math.pow(2, attempt - 1) * baseMs;
        case 'linear':
            return attempt * baseMs;
        case 'constant':
            return baseMs;
        default:
            return baseMs;
    }
}

const sleep = (ms: string) => new Promise(resolve => setTimeout(resolve, parseInt(ms)));

// Custom Error classes
class FatalError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FatalError";
    }
}

class RetryableError extends Error {
    retryAfterMs?: number;

    constructor(message: string, retryAfterMs?: number) {
        super(message);
        this.name = "RetryableError";
        this.retryAfterMs = retryAfterMs;
    }
}

// Mock Step Execution Wrapper
async function runStepWithRetry(
    stepName: string,
    stepFn: () => Promise<void>,
    errorConfig: any
) {
    const maxRetries = errorConfig.maxRetries ?? 3;
    const backoffPolicy = errorConfig.backoffPolicy || 'exponential';
    const baseDelay = errorConfig.baseDelay || '100ms'; // Use small delay for test
    const failureAction = errorConfig.failureAction || 'retry';
    const fatalPatterns = errorConfig.fatalErrorPatterns || [];

    let lastError: any = null;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[${stepName}] Attempt ${attempt}/${maxRetries}`);
            await stepFn();
            console.log(`[${stepName}] Succeeded on attempt ${attempt}`);
            success = true;
            break;
        } catch (error: any) {
            lastError = error;
            console.error(`[${stepName}] Failed on attempt ${attempt}:`, error.message);

            // Check for FatalError
            if (error.name === 'FatalError') {
                console.error(`[${stepName}] Fatal error encountered, stopping retries.`);
                throw error;
            }

            // Check for fatal patterns
            if (fatalPatterns.some((p: string) => error.message.includes(p))) {
                console.error(`[${stepName}] Error matches fatal pattern, stopping retries.`);
                throw new FatalError(error.message);
            }

            if (failureAction === 'fail-workflow') {
                throw new Error(`Fatal error in ${stepName}: ${error.message}`);
            }

            if (attempt < maxRetries) {
                let delay = calculateBackoff(attempt, backoffPolicy, baseDelay);

                if (error.name === 'RetryableError' && error.retryAfterMs) {
                    delay = error.retryAfterMs;
                    console.log(`[${stepName}] RetryableError requested custom delay: ${delay}ms`);
                } else {
                    console.log(`[${stepName}] Retrying after ${delay}ms...`);
                }

                await sleep(delay + "ms");
            }
        }
    }

    if (failureAction === 'retry' && !success) {
        throw new Error(`Max retries (${maxRetries}) exceeded for ${stepName}: ${lastError?.message}`);
    }
}

// Tests
async function runTests() {
    console.log("--- Test 1: Standard Retry (Success after 2 attempts) ---");
    let attempts1 = 0;
    await runStepWithRetry("Test1", async () => {
        attempts1++;
        if (attempts1 < 2) throw new Error("Temporary failure");
    }, { maxRetries: 3 });
    console.log("Test 1 Passed\n");

    console.log("--- Test 2: FatalError (Stop immediately) ---");
    try {
        await runStepWithRetry("Test2", async () => {
            throw new FatalError("Stop now");
        }, { maxRetries: 3 });
    } catch (e: any) {
        if (e.name === 'FatalError') console.log("Test 2 Passed: Caught FatalError\n");
        else console.error("Test 2 Failed:", e);
    }

    console.log("--- Test 3: Fatal Pattern (Stop immediately) ---");
    try {
        await runStepWithRetry("Test3", async () => {
            throw new Error("404 Not Found");
        }, { maxRetries: 3, errorTypeHandling: 'custom', fatalErrorPatterns: ['404'] });
    } catch (e: any) {
        if (e.name === 'FatalError') console.log("Test 3 Passed: Caught FatalError from pattern\n");
        else console.error("Test 3 Failed:", e);
    }

    console.log("--- Test 4: RetryableError (Custom delay) ---");
    const start = Date.now();
    await runStepWithRetry("Test4", async () => {
        if (Date.now() - start < 200) throw new RetryableError("Wait longer", 300);
    }, { maxRetries: 3 });
    console.log("Test 4 Passed\n");
}

runTests().catch(console.error);
