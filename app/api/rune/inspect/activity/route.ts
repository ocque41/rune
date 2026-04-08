import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const cursor = searchParams.get('cursor'); // Timestamp for keyset pagination
    const range = searchParams.get('range'); // 24h, 7d, 30d

    let fromDate: string | null = null;
    if (range) {
        const start = new Date();
        if (range === '24h') start.setDate(start.getDate() - 1);
        if (range === '7d') start.setDate(start.getDate() - 7);
        if (range === '30d') start.setDate(start.getDate() - 30);
        fromDate = start.toISOString();
    }

    // Fetch usage events
    let query = supabase
        .from('rune_agent_usage_events')
        .select('id, created_at, model, total_tokens, estimated_cost_usd, latency_ms, status, source')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (cursor) {
        query = query.lt('created_at', cursor);
    }
    if (fromDate) {
        query = query.gte('created_at', fromDate);
    }

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }

    // Map to unified "Activity" format
    const items = (data || []).map(item => ({
        id: item.id,
        type: 'llm_call',
        timestamp: item.created_at,
        details: {
            model: item.model,
            tokens: item.total_tokens,
            cost: item.estimated_cost_usd,
            latency: item.latency_ms,
            status: item.status,
            source: item.source
        }
    }));

    // Determine next cursor
    let nextCursor = null;
    if (items.length === limit) {
        nextCursor = items[items.length - 1].timestamp;
    }

    return NextResponse.json({
        items,
        next_cursor: nextCursor
    });
}
