import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listRuns } from '@/lib/run-store';

export const dynamic = 'force-dynamic';

import { withTrace } from '@/lib/trace';

export async function GET(req: NextRequest) {
    return withTrace('api.runs.list', async () => {
        try {
            const url = new URL(req.url);
            const limit = parseInt(url.searchParams.get('limit') || '50', 10);
            const offset = parseInt(url.searchParams.get('offset') || '0', 10);

            const supabase = await createClient();
            const runs = await listRuns(supabase, { limit, offset });
            return NextResponse.json({ success: true, runs });
        } catch (error) {
            console.error('Error listing runs:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to list runs' },
                { status: 500 }
            );
        }
    });
}
