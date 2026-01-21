/**
 * Runtime Types for Workflow Step Execution
 * 
 * These types define the standard shapes for step results, errors, and logs
 * used across all workflow step functions.
 */

export interface StepResult<T = unknown> {
    ok: boolean;
    output?: T;
    error?: SerializedError;
    retryable?: boolean;
    logs?: LogEntry[];
    timing?: StepTiming;
}

export interface SerializedError {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    details?: Record<string, unknown>;
}

export interface LogEntry {
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: unknown;
}

export interface StepTiming {
    startedAt: number;
    completedAt: number;
    durationMs: number;
}

// HTTP Request types
export interface HttpRequestConfig {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeout?: number;
    idempotencyKey?: string;
}

export interface HttpResponse {
    status: number;
    statusText?: string;
    headers?: Record<string, string>;
    data?: unknown;
    timing?: { durationMs: number };
}

// Email types
export interface EmailConfig {
    recipient: string;
    subject: string;
    body: string;
    from?: string;
    replyTo?: string;
    idempotencyKey?: string;
}

export interface EmailResult {
    status: 'sent' | 'queued' | 'mocked';
    messageId?: string;
    recipient: string;
}

// Database types
export interface DbQueryConfig {
    connectionString: string;
    query: string;
    idempotencyKey?: string;
}

export interface MongoDbConfig {
    connectionString: string;
    operation: string; // JSON string with collection, operation, query, etc.
    idempotencyKey?: string;
}

export interface DbQueryResult {
    status: 'success' | 'not_configured' | 'error';
    rows?: unknown[];
    rowCount?: number;
    result?: unknown; // For MongoDB
    message?: string;
}

// Script types
export interface ScriptConfig {
    code: string;
    context?: Record<string, unknown>;
    timeoutMs?: number;
}

export interface ScriptResult {
    status: 'success' | 'error';
    result?: unknown;
    logs?: string[];
}

// Slack types
export interface SlackConfig {
    webhookUrl: string;
    channel?: string;
    message: string;
    idempotencyKey?: string;
}

export interface SlackResult {
    status: 'sent' | 'not_configured' | 'mocked';
    channel?: string;
}

// Stream types
export interface StreamConfig {
    message: string;
}

export interface StreamResult {
    status: 'streamed' | 'no_writable';
    message: string;
}

// Event types
export interface WaitForEventConfig {
    event: string;
    timeout?: string;
}

export interface WaitForEventResult {
    status: 'received' | 'waiting' | 'timeout';
    event: string;
    data?: unknown;
}

// Approval types
export interface ApprovalConfig {
    approverEmail: string;
    timeout?: string;
    message?: string;
}

export interface ApprovalResult {
    status: 'approved' | 'rejected' | 'waiting' | 'timeout';
    approver: string;
    respondedAt?: string;
}

// AI types
export interface AiConfig {
    prompt: string;
    model?: string;
    provider?: 'gemini' | 'anthropic' | 'generic';
    maxTokens?: number;
}

export interface AiResult {
    status: 'success' | 'mocked' | 'error';
    content: string;
    model?: string;
    provider?: string;
    usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
    };
}

// Transform types
export interface TransformConfig {
    mapping: string; // JavaScript expression
    data: unknown;
}

export interface TransformResult {
    status: 'success' | 'error';
    result?: unknown;
}

// Sleep types
export interface SleepConfig {
    duration: string; // e.g., "5s", "1m", "500ms"
}

export interface SleepResult {
    status: 'completed';
    requestedDuration: string;
    actualDurationMs: number;
}

// Sub-workflow types
export interface SubWorkflowConfig {
    workflowId: string;
    params?: Record<string, unknown>;
}

export interface SubWorkflowResult {
    status: 'completed' | 'failed' | 'not_found';
    result?: unknown;
    error?: string;
}

// Schedule types
export interface ScheduleConfig {
    cron: string;
    timezone?: string;
    enabled?: boolean;
}

/**
 * Helper to create a success result
 */
export function successResult<T>(output: T, logs?: LogEntry[]): StepResult<T> {
    return { ok: true, output, logs };
}

/**
 * Helper to create an error result
 */
export function errorResult(
    error: Error | string,
    retryable = false,
    logs?: LogEntry[]
): StepResult<never> {
    const err: SerializedError = typeof error === 'string'
        ? { name: 'Error', message: error }
        : { name: error.name, message: error.message, stack: error.stack };

    return { ok: false, error: err, retryable, logs };
}

/**
 * Helper to serialize an error safely
 */
export function serializeError(error: unknown): SerializedError {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
        };
    }
    return {
        name: 'UnknownError',
        message: String(error),
    };
}
