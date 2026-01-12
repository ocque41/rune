import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const runId = params.id;

        // Verify run ownership first
        const { data: run, error: runError } = await supabase
            .from('rune_runs')
            .select('id')
            .eq('id', runId)
            .eq('user_id', user.id)
            .single();

        if (runError || !run) {
            return NextResponse.json({ error: 'Run not found or access denied' }, { status: 404 });
        }

        // Fetch steps
        const { data: steps, error: stepsError } = await supabase
            .from('rune_run_steps')
            .select('*')
            .eq('run_id', runId)
            .order('started_at', { ascending: true });

        if (stepsError) {
            console.error('Fetch Steps Error:', stepsError);
            throw stepsError;
        }

        // Formatted Output (cleaning json fields if needed)
        // ...

        return NextResponse.json({ steps: steps || [] });

    } catch (error) {
        console.error('Run Steps API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
