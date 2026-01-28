import { createClient } from '@/lib/supabase/server';
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

    let query = supabase
        .from('rune_llm_calls')
        .select('model, total_tokens, estimated_cost_usd, status, prompt_tokens, output_tokens')
        .eq('user_id', user.id);

    if (from) query = query.gte('created_at', from);
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
    const models: Record<string, number> = {};

    if (data) {
        data.forEach(call => {
            totalCalls++;
            const pt = call.prompt_tokens || 0;
            const ot = call.output_tokens || 0;

            promptTokens += pt;
            completionTokens += ot;
            totalTokens += (call.total_tokens || (pt + ot));
            totalCost += (call.estimated_cost_usd || 0);

            if (call.model) {
                models[call.model] = (models[call.model] || 0) + 1;
            }
        });
    }

    // Fetch Tool Invocations Count
    let toolCount = 0;
    let toolQuery = supabase
        .from('rune_tool_invocations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

    if (from) toolQuery = toolQuery.gte('created_at', from);
    if (to) toolQuery = toolQuery.lte('created_at', to);

    const { count, error: toolError } = await toolQuery;
    if (!toolError && count !== null) {
        toolCount = count;
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
