import { createClient } from '@/lib/supabase/server';
import { calculateEstimatedCost } from './pricing';

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

    // Metrics
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cachedTokens?: number;
    latencyMs?: number;

    // Tools
    toolName?: string;
    toolCallsCount?: number;
    isHighImpactTool?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';

    status: 'success' | 'error' | 'blocked';
    metadata?: Record<string, any>;
}

export async function logUsageEvent(payload: UsageEventPayload) {
    try {
        const supabase = await createClient();

        // Calculate cost if tokens are present
        let estimatedCost = 0;
        if (payload.inputTokens || payload.outputTokens) {
            estimatedCost = calculateEstimatedCost({
                model: payload.model,
                inputTokens: payload.inputTokens || 0,
                outputTokens: payload.outputTokens || 0,
                cachedTokens: payload.cachedTokens
            });
        }

        // Insert async (fire and forget pattern safe for this context)
        // We use the service role to ensure we can write audit logs regardless of current RLS context
        // BUT 'createClient' usually uses user auth. 
        // If we are in a server action with a user, it works via RLS 'userId = auth.uid()'.
        // If we are in a background worker, we might need a service role client.
        // For now, we assume this runs in context of the user triggering the action.

        // Note: The RLS policy we created checks `auth.uid() = user_id`.
        // So we MUST ensure payload.userId matches the current session.

        /* 
           DESIGN DECISION: 
           If we are running in a background job (Cron), we won't have a user session.
           We should probably use a Service Role client if available, OR relying on the fact 
           that `createClient` from `@/lib/supabase/server` might handle this dynamic.
           
           However, `lib/supabase/server.ts` usually creates a cookie-based client.
           
           For Autonomy loops (which might run as system), we need a way to bypass RLS.
           We will catch errors here to prevent crashing the main thread.
        */

        const { error } = await supabase.from('rune_agent_usage_events').insert({
            user_id: payload.userId,
            source: payload.source,
            workflow_id: payload.workflowId,
            chat_id: payload.chatId,
            job_id: payload.jobId,
            step_id: payload.stepId,
            request_id: payload.requestId,

            provider: payload.provider || 'gemini',
            model: payload.model,
            input_tokens: payload.inputTokens || 0,
            output_tokens: payload.outputTokens || 0,
            total_tokens: payload.totalTokens || 0,
            cached_tokens: payload.cachedTokens || 0,
            latency_ms: payload.latencyMs,

            tool_name: payload.toolName,
            tool_calls_count: payload.toolCallsCount || 0,
            is_high_impact_tool: payload.isHighImpactTool || false,
            approval_status: payload.approvalStatus,

            estimated_cost_usd: estimatedCost,
            status: payload.status,
            metadata: payload.metadata || {}
        });

        if (error) {
            console.error("Failed to log usage event:", error);
        }

    } catch (err) {
        // Swallow errors to avoid failing the main request
        console.error("Error logging usage event:", err);
    }
}
