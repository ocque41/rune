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

            const url = new URL(req.url);
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');

            let query = supabase
                .from('rune_agent_usage_events')
                .select('tool_name, tool_calls_count, status')
                .eq('user_id', user.id)
                .not('tool_name', 'is', null);

            if (from) {
                const fromValue = from.includes('T') ? from : `${from}T00:00:00.000Z`;
                query = query.gte('created_at', fromValue);
            }
            if (to) {
                const toValue = to.includes('T') ? to : `${to}T23:59:59.999Z`;
                query = query.lte('created_at', toValue);
            }

            const { data, error } = await query;
            if (error) throw error;

            const toolsMap = new Map<string, { tool_name: string; total_calls: number; error_calls: number }>();

            for (const row of data || []) {
                const tool = row.tool_name as string;
                if (!tool) continue;

                if (!toolsMap.has(tool)) {
                    toolsMap.set(tool, { tool_name: tool, total_calls: 0, error_calls: 0 });
                }

                const entry = toolsMap.get(tool)!;
                entry.total_calls += row.tool_calls_count || 1;
                if (row.status === 'error') {
                    entry.error_calls += 1;
                }
            }

            return NextResponse.json({ tools: Array.from(toolsMap.values()) });
        } catch (error: unknown) {
            console.error('Inspect Tools Error:', error);
            return NextResponse.json({ error: 'Failed to fetch tools' }, { status: 500 });
        }
    });
}
