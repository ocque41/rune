import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';

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
                // Found a scheduled workflow!
                // In a robust system, we would check the Cron Expression against current time here.
                // For this implementation, we assume the external caller handles the timing
                // or we run it "on tick" and let the engine handle checks (engine doesn't handle cron checks usually).

                // We will Trigger it.
                // TODO: Implement actual cron expression parsing check to avoid double-runs if called frequently.

                try {
                    console.log(`[Cron] Triggering workflow ${wf.name} (${wf.id})`);
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
                    console.error(`[Cron] Failed to run workflow ${wf.id}:`, e);
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
