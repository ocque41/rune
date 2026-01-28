import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withTrace('api.inspect.tools', async () => {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            // Currently we pull from rune_tool_invocations for detailed stats
            // Or we can assume usage_rollups has tool info if we populated 'tool_name'
            // The prompt says "returns breakdown by tool".
            // Let's query rune_tool_invocations for accuracy over a range, or rollups if possible.
            // Since rollups might not have granular tool data fully populated yet (migration just happened), 
            // let's query the raw invocations table but limit rows or use a groupBy query if Supabase allowed it easily.
            // But Supabase client-side grouping is not standard.
            // We'll stick to rollup table if we trust it, or raw table.
            // Let's use rune_tool_invocations for raw count aggregation if the range is small, 
            // but 'rune_usage_rollups_daily' has 'tool_name' column.
            // Using rollups is safer for performance.

            const url = new URL(req.url);
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');

            let query = supabase
                .from('rune_usage_rollups_daily')
                .select('*')
                .eq('user_id', user.id)
                .neq('tool_name', null); // Only rows where tool_name is set

            if (from) query = query.gte('day', from);
            if (to) query = query.lte('day', to);

            const { data, error } = await query;

            if (error) throw error;

            const toolsMap = new Map<string, any>();

            if (data) {
                data.forEach((row) => {
                    const tool = row.tool_name;
                    if (!tool) return;

                    if (!toolsMap.has(tool)) {
                        toolsMap.set(tool, {
                            tool_name: tool,
                            total_calls: 0,
                            cost: 0 // usually 0 unless tools cost money
                        });
                    }
                    const entry = toolsMap.get(tool);
                    entry.total_calls += row.tool_calls_count || 0;
                });
            }

            return NextResponse.json({ tools: Array.from(toolsMap.values()) });
        } catch (error: unknown) {
            console.error('Inspect Tools Error:', error);
            return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
        }
    });
}
