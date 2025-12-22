import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';
import cronParser from 'cron-parser';

export const dynamic = 'force-dynamic'; // Prevent caching

// GET /api/cron
// This endpoint should be called by an external scheduler (e.g. Vercel Cron, GitHub Actions)
export async function GET() {
    try {
        const supabase = createAdminClient();

        // 1. Fetch all workflows (active)
        // Ideally we'd have an 'active' flag or 'schedule' column.
        // For now, fetch generic list. Limit to 50 for safety.
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
                .order('version', { ascending: false })
                .limit(1)
                .single();

            if (!latestVersion?.graph_json) continue;

            const nodes = latestVersion.graph_json.nodes;
            const edges = latestVersion.graph_json.edges;

            if (!Array.isArray(nodes)) continue;

            // Check if there is a 'schedule' node or 'Start Workflow' with schedule config
            // Based on nodeTypes: schedule: ScheduleNode
            const scheduleNode = nodes.find((n: any) => n.type === 'schedule');

            if (scheduleNode) {
                // Check if we should run now
                try {
                    const cronExpression = scheduleNode.data.cron || '0 0 * * *';
                    const interval = cronParser.parseExpression(cronExpression);

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
                        // Actually, better logic for "triggering via Vercel Cron" which usually hits every minute:
                        // If Vercel Cron hits at 12:00:00, and schedule is 12:00, diff is ~0.
                        // If schedule is 12:00 and we hit at 12:01, diff is 60s.
                        // So if diff is within reasonably small window (e.g. 70s to account for latency), run it.
                        // AND we must ensure we haven't already run it? 
                        // For MVP: Simple "Is it essentially now?" check. 
                        // But wait, if cron is "Every Friday", prev() will be last Friday. diff will be huge. 
                        // So we only run if diff is small.

                        console.log(`[Cron] Skipping ${wf.name} - Not due. Last due: ${prevDate.toISOString()}`);
                        continue;
                    }

                    console.log(`[Cron] Triggering workflow ${wf.name} (${wf.id}) - Due: ${prevDate.toISOString()}`);
                    const engine = new WorkflowEngine(
                        wf.id,
                        wf.name || 'Scheduled Workflow',
                        nodes,
                        edges || []
                    );

                    // Run with some cron metadata
                    await engine.run({
                        trigger: 'cron',
                        timestamp: new Date().toISOString(),
                        scheduleMetadata: scheduleNode.data
                    });

                    triggered.push(wf.name || wf.id);
                } catch (e: any) {
                    console.error(`[Cron] Failed to run/check workflow ${wf.id}:`, e);
                    errors.push({ id: wf.id, error: e.message });
                }
            }
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
