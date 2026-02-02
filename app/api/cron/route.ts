import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';
import CronParser from 'cron-parser';
import { processPendingEvents } from '@/lib/autonomy/service';

import { executeJob } from '@/lib/autonomy/execution';

export const dynamic = 'force-dynamic'; // Prevent caching

// GET /api/cron
// This endpoint should be called by an external scheduler (e.g. Vercel Cron, GitHub Actions)
export async function GET(req: Request) {
    try {
        const cronSecret = process.env.RUNE_CRON_SECRET;
        if (cronSecret) {
            const headerSecret = req.headers.get('x-rune-cron-secret');
            const url = new URL(req.url);
            const querySecret = url.searchParams.get('secret');
            const vercelCron = req.headers.get('x-vercel-cron');
            if (headerSecret !== cronSecret && querySecret !== cronSecret && vercelCron !== '1') {
                return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
            }
        }

        const supabase = createAdminClient();

        // 1. Ingest Events
        await processPendingEvents(supabase);

        // 2. Worker Loop: Lease & Execute Autonomy Jobs
        // We run a "worker" here for the duration of the request (max 10s usually).
        // Lease up to 5 jobs for 5 minutes (300s)
        const { data: leasedJobs, error: leaseError } = await supabase
            .rpc('lease_jobs', {
                worker_name: 'cron-worker-vercel',
                limit_count: 5,
                lease_seconds: 300
            });

        if (leaseError) {
            console.error('[Cron] Lease failed:', leaseError);
        } else if (leasedJobs && leasedJobs.length > 0) {
            console.log(`[Cron] Leased ${leasedJobs.length} jobs. Executing...`);
            // Execute in parallel or sequence? Sequence is safer for memory/CPU here.
            for (const job of leasedJobs) {
                await executeJob(job.id, supabase);
            }
        }

        // 3. Schedule Checks (Existing Logic)
        const { data: workflows, error } = await supabase
            .from('rune_workflows')
            .select('id, name')
            .limit(50);

        if (error) throw error;

        const triggered: string[] = [];
        const errors: any[] = [];

        // 2. Iterate and check for Schedule Node
        for (const wf of workflows) {
            // Get latest version for this workflow
            const { data: latestVersion } = await supabase
                .from('rune_workflow_versions')
                .select('*')
                .eq('workflow_id', wf.id)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();

            if (!latestVersion?.definition_json) continue;

            const nodes = latestVersion.definition_json?.graph?.nodes;
            const edges = latestVersion.definition_json?.graph?.edges;

            if (!Array.isArray(nodes)) continue;

            // Check if there is a 'schedule' node or 'Start Workflow' with schedule config
            // Based on nodeTypes: schedule: ScheduleNode
            const scheduleNode = nodes.find((n: any) => n.type === 'schedule');

            if (scheduleNode) {
                // Check if we should run now
                try {
                    const cronExpression = scheduleNode.data.cron || '0 0 * * *';
                    const interval = CronParser.parse(cronExpression);

                    // We check if the *previous* scheduled time was within the last minute
                    // This is a simple way to check "is it due now?" for a minutely cron job
                    const prev = interval.prev();
                    const prevDate = prev.toDate();
                    const now = new Date();

                    // If the previous scheduled run was less than 60 seconds ago, we run it.
                    // This assumes the cron job runs at least every minute.
                    const diffMs = now.getTime() - prevDate.getTime();
                    const oneMinuteMs = 60 * 1000;

                    if (diffMs > oneMinuteMs) {
                        // Not due yet (or we missed it by a lot - simplistic check)
                        console.log(`[Cron] Skipping ${wf.name} - Not due. Last due: ${prevDate.toISOString()}`);
                        continue;
                    }

                    console.log(`[Cron] Triggering workflow ${wf.name} (${wf.id}) - Due: ${prevDate.toISOString()}`);
                    const engine = new WorkflowEngine(
                        supabase,
                        wf.id,
                        wf.name || 'Scheduled Workflow',
                        nodes,
                        edges || [],
                        latestVersion.id // Pass version ID
                    );

                    // Run with some cron metadata
                    await engine.run({
                        trigger: 'cron',
                        timestamp: new Date().toISOString(),
                        scheduleMetadata: scheduleNode.data
                    }, scheduleNode.id);

                    triggered.push(wf.name || wf.id);
                } catch (e: any) {
                    console.error(`[Cron] Failed to run/check workflow ${wf.id}:`, e);
                    errors.push({ id: wf.id, error: e.message });
                }
            }
        }


        // 4. Daily Rollup (Yesterday & Today)
        try {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            await supabase.rpc('rollup_daily_usage', { target_day: yesterday });
            await supabase.rpc('rollup_daily_usage', { target_day: today });

            console.log('[Cron] Usage rollup completed');
        } catch (e) {
            console.error('[Cron] Usage rollup failed:', e);
            errors.push({ type: 'rollup', error: e });
        }

        return NextResponse.json({
            success: true,
            message: 'Cron check completed',
            triggered,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error: any) {
        console.error('Cron error:', error);
        return NextResponse.json(
            { success: false, error: 'Cron check failed' },
            { status: 500 }
        );
    }
}
