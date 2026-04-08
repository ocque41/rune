import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { withTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withTrace('api.inspect.models', async () => {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const url = new URL(req.url);
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');

            let query = supabase
                .from('rune_agent_usage_daily_rollup')
                .select('*')
                .eq('user_id', user.id);

            if (from) query = query.gte('day', from);
            if (to) query = query.lte('day', to);

            let { data, error } = await query;
            if (error) {
                // Backward-compatible fallback.
                let fallback = supabase
                    .from('rune_usage_rollups_daily')
                    .select('*')
                    .eq('user_id', user.id);
                if (from) fallback = fallback.gte('day', from);
                if (to) fallback = fallback.lte('day', to);
                const fallbackResult = await fallback;
                data = fallbackResult.data;
                error = fallbackResult.error;
            }

            if (error) throw error;

            // Group by model
            const modelsMap = new Map<string, any>();

            if (data) {
                data.forEach((row) => {
                    const model = row.model || 'unknown';
                    if (!modelsMap.has(model)) {
                        modelsMap.set(model, {
                            model,
                            total_cost_usd: 0,
                            total_tokens: 0,
                            total_calls: 0
                        });
                    }
                    const entry = modelsMap.get(model);
                    entry.total_cost_usd += Number(row.estimated_cost_usd) || 0;
                    entry.total_tokens += Number(row.total_tokens) || 0;
                    entry.total_calls += row.calls_count || 0;
                });
            }

            return NextResponse.json({ models: Array.from(modelsMap.values()) });
        } catch (error: unknown) {
            console.error('Inspect Models Error:', error);
            return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
        }
    });
}
