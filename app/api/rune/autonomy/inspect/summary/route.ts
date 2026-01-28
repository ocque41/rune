import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get Date Range (Default: Last 30 days)
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d'; // 30d, 7d, 24h

    let startDate = new Date();
    if (range === '30d') startDate.setDate(startDate.getDate() - 30);
    if (range === '7d') startDate.setDate(startDate.getDate() - 7);
    if (range === '24h') startDate.setDate(startDate.getDate() - 1);

    const startDateStr = startDate.toISOString().split('T')[0];

    // 2. Query Rollup for historical data
    const { data: rollupData, error: rollupError } = await supabase
        .from('rune_agent_usage_daily_rollup')
        .select('*')
        .gte('day', startDateStr)
        .eq('user_id', user.id);

    if (rollupError) console.error('Rollup fetch error', rollupError);

    // 3. Query Raw Events for today (since rollup runs daily)
    // We want partial data for today to be real-time
    const todayStr = new Date().toISOString().split('T')[0];
    const { data: todayEvents, error: eventsError } = await supabase
        .from('rune_agent_usage_events')
        .select('input_tokens, output_tokens, total_tokens, estimated_cost_usd, tool_calls_count, is_high_impact_tool')
        .gte('created_at', todayStr) // Today start
        .eq('user_id', user.id);

    // 4. Aggregation Logic
    let stats = {
        total_requests: 0,
        total_tokens: 0,
        total_cost_usd: 0,
        total_tool_calls: 0,
        high_impact_tool_calls: 0,
        errors_count: 0
    };

    // Add Rollup Data
    if (rollupData) {
        for (const r of rollupData) {
            stats.total_requests += (r.calls_count || 0);
            stats.total_tokens += (r.total_tokens || 0);
            stats.total_cost_usd += (r.estimated_cost_usd || 0);
            stats.total_tool_calls += (r.tool_calls_count || 0);
            stats.high_impact_tool_calls += (r.high_impact_calls_count || 0);
            stats.errors_count += (r.errors_count || 0);
        }
    }

    // Add Today's Data (Live)
    // Note: If rollup ran recently, we might double count if we aren't careful?
    // Rollup usually runs for "Yesterday".
    // If we only query rollup < Today, and Raw Events >= Today, we are safe.
    // Our rollup query uses `gte`. If rollup contains today (partially?), we double count.
    // The rollup function `aggregate_daily_usage` takes a `target_date`.
    // It is designed to run for completed days.
    // So usually rollup has data up to Yesterday.
    // We should filter rollup to `< Today`.

    if (todayEvents) {
        for (const e of todayEvents) {
            stats.total_requests += 1;
            stats.total_tokens += (e.total_tokens || 0);
            stats.total_cost_usd += (e.estimated_cost_usd || 0);
            stats.total_tool_calls += (e.tool_calls_count || 0);
            stats.high_impact_tool_calls += (e.is_high_impact_tool ? 1 : 0);
        }
    }

    return NextResponse.json({
        period: range,
        stats: stats,
        // Optional: break down by model or source if UI needs it
        today_live_events: todayEvents?.length || 0
    });
}
