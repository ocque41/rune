import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withTrace('api.inspect.summary', async () => {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const url = new URL(req.url);
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');
            const range = url.searchParams.get('range');
            let normalizedFrom = from;
            if (!normalizedFrom && range) {
                const start = new Date();
                if (range === '24h') start.setDate(start.getDate() - 1);
                if (range === '7d') start.setDate(start.getDate() - 7);
                if (range === '30d') start.setDate(start.getDate() - 30);
                normalizedFrom = start.toISOString().split('T')[0];
            }

            let query = supabase
                .from('rune_agent_usage_daily_rollup')
                .select('*')
                .eq('user_id', user.id);

            if (normalizedFrom) query = query.gte('day', normalizedFrom);
            if (to) query = query.lte('day', to);

            let { data, error } = await query;

            if (error) {
                // Backward-compatible fallback for older table name.
                let fallbackQuery = supabase
                    .from('rune_usage_rollups_daily')
                    .select('*')
                    .eq('user_id', user.id);
                if (normalizedFrom) fallbackQuery = fallbackQuery.gte('day', normalizedFrom);
                if (to) fallbackQuery = fallbackQuery.lte('day', to);

                const fallback = await fallbackQuery;
                data = fallback.data;
                error = fallback.error;
            }

            if (error) throw error;

            // Aggregate in memory (fast enough for daily rollups)
            const summary = {
                total_cost_usd: 0,
                total_tokens: 0,
                total_calls: 0,
                total_tool_calls: 0,
            };

            if (data) {
                data.forEach((row) => {
                    summary.total_cost_usd += Number(row.estimated_cost_usd) || 0;
                    summary.total_tokens += Number(row.total_tokens) || 0;
                    summary.total_calls += row.calls_count || 0;
                    summary.total_tool_calls += row.tool_calls_count || 0;
                });
            }

            return NextResponse.json(summary);
        } catch (error: unknown) {
            console.error('Inspect Summary Error:', error);
            return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 });
        }
    });
}
