import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Fetch Profile & Protocol/Product Limits
        // (Assuming simple tier logic for now based on profile)
        const { data: profile } = await supabase
            .from('profiles')
            .select('tier, subscription_status')
            .eq('id', user.id)
            .single();

        const limits = {
            maxWorkflows: profile?.tier === 'pro' ? 100 : 10,
            maxRunsRetentionDays: profile?.tier === 'pro' ? 90 : 7,
            modelCaps: profile?.tier === 'pro' ? 'gpt-4' : 'gpt-3.5-turbo'
        };

        // 2. Fetch Active Session
        const { data: activeSession } = await supabase
            .from('rune_agent_sessions')
            .select('id, active_workflow_id, active_draft_id, active_run_id')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        // 3. Recent Workflows
        const { data: workflows } = await supabase
            .from('rune_workflows')
            .select('id, name, updated_at, last_opened_at')
            .eq('user_id', user.id)
            .filter('archived_at', 'is', null)
            .order('last_opened_at', { ascending: false, nullsFirst: false })
            .limit(5);

        // 4. Recent Runs
        const { data: recentRuns } = await supabase
            .from('rune_runs')
            .select('id, workflow_id, status, created_at, completed_at, error_message')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);

        return NextResponse.json({
            user: {
                id: user.id,
                email: user.email,
                plan: profile?.tier || 'free'
            },
            active: {
                workflowId: activeSession?.active_workflow_id,
                draftId: activeSession?.active_draft_id,
                runId: activeSession?.active_run_id,
                agentSessionId: activeSession?.id
            },
            workflows: workflows || [],
            recentRuns: recentRuns?.map((r: any) => ({
                id: r.id,
                workflowId: r.workflow_id,
                status: r.status,
                startedAt: r.created_at, // Mapping created_at to startedAt as implicit start
                finishedAt: r.completed_at,
                error: r.error_message
            })) || [],
            limits
        });

    } catch (error) {
        console.error('Account Context API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
