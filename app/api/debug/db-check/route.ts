import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    const start = performance.now();
    const logData: any = {
        checks: {},
        timings: {},
        timestamp: new Date().toISOString()
    };

    try {
        const supabase = await createClient();

        // 1. Auth Check (Is Supabase client working?)
        const authStart = performance.now();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        logData.timings.auth_ms = Math.round(performance.now() - authStart);
        logData.checks.auth = !!user;
        logData.user_id = user?.id || 'anon';

        if (authError && authError.message !== 'Auth session missing!') {
            logData.checks.auth_error = authError.message;
        }

        // 2. Simple DB Read (Count workflows - fast)
        // Note: This tests RLS visibility too
        const dbStart = performance.now();
        const { count, error: dbError } = await supabase
            .from('rune_workflows')
            .select('*', { count: 'exact', head: true });

        logData.timings.db_read_ms = Math.round(performance.now() - dbStart);
        logData.checks.db_connected = !dbError;
        logData.checks.row_count = count;

        if (dbError) {
            logData.checks.db_error = dbError.message;
            console.error('[DB Check] DB Error:', dbError);
        }

        // Total time
        logData.timings.total_ms = Math.round(performance.now() - start);

        return NextResponse.json({
            ok: !logData.checks.db_error,
            ...logData
        });

    } catch (e: any) {
        console.error('[DB Check] Fatal Error:', e);
        return NextResponse.json({
            ok: false,
            error: e.message,
            ...logData
        }, { status: 500 });
    }
}
