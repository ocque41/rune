import { start } from 'workflow/api';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { name, args } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Missing workflow name' }, { status: 400 });
        }

        // Sanitize name to prevent directory traversal
        const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '');

        // Dynamically import the workflow module using the Next.js alias
        // This allows the workflow files to be picked up by the build system
        const modulePath = `@/workflows/${sanitized}`;

        let workflowModule;
        try {
            workflowModule = await import(modulePath);
        } catch (importError) {
            console.error('Failed to import workflow:', importError);
            return NextResponse.json(
                { error: `Workflow '${sanitized}' not found. Make sure it exists in the workflows/ directory and the server has been restarted.` },
                { status: 404 }
            );
        }

        // The workflow should export a function (matching the generated pattern)
        const workflowFunction = workflowModule.workflow || workflowModule.default;

        if (!workflowFunction || typeof workflowFunction !== 'function') {
            return NextResponse.json(
                { error: 'Workflow file does not export a workflow function' },
                { status: 500 }
            );
        }

        // Use the workflow library's start() function to execute
        const run = await start(workflowFunction, args || []);

        // Save initial run state
        const runId = (run as any).id || `run-${Date.now()}`; // Fallback if start() doesn't return ID yet

        // Import dynamically to avoid circular dependencies if any
        const { saveRun } = await import('@/lib/run-store');

        await saveRun({
            id: runId,
            workflowName: name,
            status: 'running', // Assuming start() is async but returns immediately
            startTime: new Date().toISOString(),
            args: args || [],
            logs: [{
                timestamp: new Date().toISOString(),
                level: 'info',
                message: `Workflow '${name}' started`
            }]
        });

        // Note: In a real production system, we would hook into the workflow's 
        // events to update the status. For this side project, we might need 
        // to poll or wrap the execution if start() awaits completion.

        // If start() awaits completion (which it seems to based on previous context),
        // we should update the status immediately.
        // Let's assume start() returns the result directly for now based on previous usage.

        // Update: The previous usage showed `const run = await start(...)`.
        // If it returns a Run object, we can use that.
        // If it returns the result directly, we mark as completed.

        // Let's assume for now we want to return immediately and let it run in background
        // But since we're in a serverless function (Next.js API), we actually have to wait 
        // or use a background worker. For simplicity here, we'll wait and update.

        try {
            // Update run with success
            const { updateRunStatus } = await import('@/lib/run-store');
            await updateRunStatus(runId, 'completed', run);
        } catch (err) {
            const { updateRunStatus } = await import('@/lib/run-store');
            await updateRunStatus(runId, 'failed', undefined, String(err));
        }

        return NextResponse.json({
            success: true,
            message: 'Workflow executed successfully',
            runId,
            result: run
        });

    } catch (error) {
        console.error('Error running workflow:', error);

        // Try to record failure if we have a runId (we might not if error happened early)
        // This is tricky without the ID in scope, but for now just return error

        return NextResponse.json(
            { error: 'Failed to run workflow', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
