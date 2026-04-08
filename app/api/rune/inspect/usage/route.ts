import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from'); // ISO string
    const to = searchParams.get('to');     // ISO string
    const range = searchParams.get('range'); // 24h, 7d, 30d

    let normalizedFrom = from;
    if (!normalizedFrom && range) {
        const start = new Date();
        if (range === '24h') start.setDate(start.getDate() - 1);
        if (range === '7d') start.setDate(start.getDate() - 7);
        if (range === '30d') start.setDate(start.getDate() - 30);
        normalizedFrom = start.toISOString();
    }

    let query = supabase
        .from('rune_agent_usage_events')
        .select('model, total_tokens, estimated_cost_usd, status, input_tokens, output_tokens, tool_calls_count')
        .eq('user_id', user.id);

    if (normalizedFrom) query = query.gte('created_at', normalizedFrom);
    if (to) query = query.lte('created_at', to);

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching usage:', error);
        return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Aggregation Logic (In-memory for now, scalable to SQL later)
    let totalTokens = 0;
    let promptTokens = 0;
    let completionTokens = 0;
    let totalCost = 0;
    let totalCalls = 0;
    let toolCount = 0;
    const models: Record<string, number> = {};

    if (data) {
        data.forEach(call => {
            totalCalls++;
            const pt = call.input_tokens || 0;
            const ot = call.output_tokens || 0;

            promptTokens += pt;
            completionTokens += ot;
            totalTokens += (call.total_tokens || (pt + ot));
            totalCost += (call.estimated_cost_usd || 0);
            toolCount += (call.tool_calls_count || 0);

            if (call.model) {
                models[call.model] = (models[call.model] || 0) + 1;
            }
        });
    }

    return NextResponse.json({
        total_tokens: totalTokens,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_cost_usd: totalCost,
        total_calls: totalCalls,
        total_tool_calls: toolCount,
        total_jobs: 0, // Placeholder
        models,
        status_counts: {
            success: data ? data.filter(c => c.status === 'success').length : 0,
            error: data ? data.filter(c => c.status === 'error').length : 0
        }
    });
}
