import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get('from'); // ISO string
    const to = searchParams.get('to');     // ISO string

    let query = supabase
        .from('rune_llm_calls')
        .select('model, total_tokens, estimated_cost_usd, status')
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
    let totalCost = 0;
    let totalCalls = 0;
    const models: Record<string, number> = {};

    data.forEach(call => {
        totalCalls++;
        totalTokens += (call.total_tokens || 0);
        totalCost += (call.estimated_cost_usd || 0);

        if (call.model) {
            models[call.model] = (models[call.model] || 0) + 1;
        }
    });

    return NextResponse.json({
        total_tokens: totalTokens,
        total_cost_usd: totalCost,
        total_calls: totalCalls,
        models,
        status_counts: {
            success: data.filter(c => c.status === 'success').length,
            error: data.filter(c => c.status === 'error').length
        }
    });
}
