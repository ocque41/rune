import { trace } from '@opentelemetry/api';

/**
 * Wraps a database operation in an OpenTelemetry span.
 * @param name - The name of the span (e.g., 'db.fetchWorkflows')
 * @param fn - The async operation to execute
 * @returns The result of the operation
 */
export async function withTrace<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const tracer = trace.getTracer('rune');
    return tracer.startActiveSpan(name, async (span) => {
        try {
            const result = await fn();
            return result;
        } catch (error) {
            span.recordException(error as Error);
            throw error;
        } finally {
            span.end();
        }
    });
}
