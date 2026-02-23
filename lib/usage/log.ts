import { createAdminClient } from '@/lib/supabase/server';
import { estimateCost } from '@/lib/billing/gemini-pricing';

export interface UsageEventPayload {
    userId: string;
    source: 'playground_chat' | 'autonomy_triage' | 'autonomy_plan' | 'autonomy_execute' | 'system' | string;
    model: string;
    provider?: string;

    // Context IDs
    workflowId?: string;
    chatId?: string;
    jobId?: string;
    stepId?: string;
    requestId?: string;
    runId?: string;

    // Metrics
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cachedTokens?: number;
    latencyMs?: number;

    // Tools
    toolName?: string;
    isHighImpactTool?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected' | 'none';
    durationMs?: number;
    argsRedacted?: any;

    status: 'success' | 'error' | 'blocked';
    metadata?: Record<string, any>;
    errorCode?: string;
}

export async function logUsageEvent(payload: UsageEventPayload) {
    try {
        const supabase = createAdminClient();
        let estimatedCostFromTokens: number | null = null;

        // 1. Log LLM Call if tokens are present
        if (payload.inputTokens !== undefined || payload.outputTokens !== undefined) {
            const usage = {
                prompt_tokens: payload.inputTokens || 0,
                output_tokens: payload.outputTokens || 0,
                cached_tokens: payload.cachedTokens,
            };

            const estimatedCost = estimateCost(payload.model, usage);
            estimatedCostFromTokens = estimatedCost;

            // Construct metadata including source and other fields
            const requestMetadata = {
                ...payload.metadata,
                source: payload.source,
                step_id: payload.stepId,
                request_id: payload.requestId
            };

            await supabase.from('rune_llm_calls').insert({
                user_id: payload.userId,
                workflow_id: payload.workflowId ? payload.workflowId : null, // handle empty string if any
                chat_id: payload.chatId,
                job_id: payload.jobId,
                model: payload.model,
                provider: payload.provider || 'gemini',
                prompt_tokens: usage.prompt_tokens,
                output_tokens: usage.output_tokens,
                total_tokens: payload.totalTokens || (usage.prompt_tokens + usage.output_tokens),
                cached_tokens: usage.cached_tokens || 0,
                estimated_cost_usd: estimatedCost,
                latency_ms: payload.latencyMs,
                status: payload.status,
                error_code: payload.errorCode,
                request_metadata: requestMetadata
            });
        }

        // 2. Log Tool Invocation if toolName is present
        if (payload.toolName) {
            await supabase.from('rune_tool_invocations').insert({
                user_id: payload.userId,
                workflow_id: payload.workflowId,
                job_id: payload.jobId,
                run_id: payload.runId,
                tool_name: payload.toolName,
                high_impact: payload.isHighImpactTool || false,
                approval_status: payload.approvalStatus || 'none',
                duration_ms: payload.durationMs,
                status: payload.status,
                args_redacted: payload.argsRedacted || {}
            });
        }

        // 3. Unified usage ledger for inspect/autonomy
        await supabase.from('rune_agent_usage_events').insert({
            user_id: payload.userId,
            source: payload.source,
            workflow_id: payload.workflowId || null,
            chat_id: payload.chatId || null,
            job_id: payload.jobId || null,
            step_id: payload.stepId || null,
            request_id: payload.requestId || null,
            provider: payload.provider || 'system',
            model: payload.model || 'unknown',
            input_tokens: payload.inputTokens || 0,
            output_tokens: payload.outputTokens || 0,
            total_tokens: payload.totalTokens || ((payload.inputTokens || 0) + (payload.outputTokens || 0)),
            cached_tokens: payload.cachedTokens || 0,
            latency_ms: payload.latencyMs || null,
            tool_name: payload.toolName || null,
            tool_calls_count: payload.toolName ? 1 : 0,
            is_high_impact_tool: payload.isHighImpactTool || false,
            approval_status: payload.approvalStatus || null,
            estimated_cost_usd: estimatedCostFromTokens ?? null,
            status: payload.status,
            metadata: payload.metadata || {}
        });

    } catch (err) {
        // Swallow errors to avoid failing the main request
        console.error("Error logging usage event:", err);
    }
}
