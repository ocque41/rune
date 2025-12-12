import { NextRequest, NextResponse } from 'next/server';
import { getWaitingRuns, resumeRun, appendLog, updateRunStatus } from '@/lib/run-store';

/**
 * POST /api/workflows/resume
 * 
 * Resume a workflow that is waiting for an external event or approval.
 * 
 * Body:
 *   - runId: string - The workflow run ID to resume
 *   - event: string - The event name (e.g., "payment_received" or "approval-user@example.com")
 *   - data: object - Data to pass to the waiting step
 *   
 * For approvals, data should include:
 *   - approved: boolean
 *   - reason?: string
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { runId, event, data } = body;

        if (!runId) {
            return NextResponse.json(
                { error: 'Missing runId parameter' },
                { status: 400 }
            );
        }

        if (!event) {
            return NextResponse.json(
                { error: 'Missing event parameter' },
                { status: 400 }
            );
        }

        // Find runs waiting for this event
        const waitingRuns = await getWaitingRuns(
            event.startsWith('approval-') ? 'approval' : 'event',
            event
        );

        // Check if the specified run is waiting
        const targetRun = waitingRuns.find(r => r.id === runId);

        if (!targetRun) {
            return NextResponse.json(
                {
                    error: 'No waiting run found with this ID and event',
                    runId,
                    event
                },
                { status: 404 }
            );
        }

        // Log the resume action
        await appendLog(
            runId,
            `Resuming workflow: event="${event}" data=${JSON.stringify(data)}`,
            'info'
        );

        // Clear the waiting state
        await resumeRun(runId);

        // Note: The actual workflow resumption happens through the workflow library's
        // resumeHook mechanism. This API updates run-store state and logs.
        // The workflow engine (from the `workflow` package) handles the actual
        // continuation of the suspended workflow execution.

        return NextResponse.json({
            success: true,
            runId,
            event,
            message: 'Workflow resumed successfully',
            resumedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Resume API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to resume workflow' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/workflows/resume
 * 
 * List all runs currently waiting for events or approvals.
 * 
 * Query params:
 *   - type: 'event' | 'approval' (optional, filters by waiting type)
 *   - event: string (optional, filters by specific event name)
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const type = searchParams.get('type') as 'event' | 'approval' | null;
        const event = searchParams.get('event') || undefined;

        let waitingRuns;

        if (type) {
            waitingRuns = await getWaitingRuns(type, event);
        } else {
            // Get both types
            const eventRuns = await getWaitingRuns('event', event);
            const approvalRuns = await getWaitingRuns('approval', event);
            waitingRuns = [...eventRuns, ...approvalRuns];
        }

        return NextResponse.json({
            runs: waitingRuns.map(run => ({
                id: run.id,
                workflowName: run.workflowName,
                waitingFor: run.waitingFor,
                startTime: run.startTime
            })),
            count: waitingRuns.length
        });

    } catch (error: any) {
        console.error('[Resume API] Error listing waiting runs:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to list waiting runs' },
            { status: 500 }
        );
    }
}
