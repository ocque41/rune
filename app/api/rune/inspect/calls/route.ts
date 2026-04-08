import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { withTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withTrace('api.inspect.calls', async () => {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const url = new URL(req.url);
            const limit = parseInt(url.searchParams.get('limit') || '50', 10);
            const offset = parseInt(url.searchParams.get('offset') || '0', 10);
            const workflowId = url.searchParams.get('workflowId');

            let query = supabase
                .from('rune_llm_calls')
                .select('*', { count: 'exact' })
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (workflowId) {
                query = query.eq('workflow_id', workflowId);
            }

            const { data, count, error } = await query;

            if (error) throw error;

            return NextResponse.json({ calls: data, total: count });
        } catch (error: unknown) {
            console.error('Inspect Calls Error:', error);
            return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 });
        }
    });
}
