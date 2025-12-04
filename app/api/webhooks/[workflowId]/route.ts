import { NextRequest, NextResponse } from 'next/server';
import { start } from 'workflow/api';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    try {
        const { workflowId } = await params;

        if (!workflowId) {
            return NextResponse.json(
                { success: false, error: 'Workflow ID is required' },
                { status: 400 }
            );
        }

        // Parse body if present
        let body = {};
        try {
            body = await request.json();
        } catch {
            // Body might be empty
        }

        // Sanitize workflow ID
        const sanitizedId = workflowId.replace(/[^a-zA-Z0-9_-]/g, '');

        // Try to import from the new structure (prod.ts)
        // We need to use a dynamic import path that resolves correctly
        // Since we can't easily use dynamic paths with 'import()', we might need to rely on the fact that
        // Next.js/Webpack bundles these. However, dynamic imports with template strings are tricky.
        // A better approach for this "runtime" execution in a Next.js app is difficult without a real backend.
        // But sticking to the pattern we had:

        let modulePath = `@/workflows/${sanitizedId}/prod`;

        // Fallback for legacy flat files (if migration hasn't happened yet for some reason, though save handles it)
        // But we should assume migration happens on save.
        // If the user hasn't saved/migrated, the file might still be at workflows/slug.ts

        let workflowModule;
        try {
            workflowModule = await import(`@/workflows/${sanitizedId}/prod`);
        } catch (e) {
            try {
                // Try legacy path
                workflowModule = await import(`@/workflows/${sanitizedId}`);
            } catch (legacyError) {
                console.error('Failed to import workflow:', legacyError);
                return NextResponse.json(
                    { success: false, error: `Workflow '${sanitizedId}' not found or not deployed` },
                    { status: 404 }
                );
            }
        }


        const workflowFunction = workflowModule.workflow || workflowModule.default;

        if (!workflowFunction || typeof workflowFunction !== 'function') {
            return NextResponse.json(
                { success: false, error: 'Workflow file does not export a workflow function' },
                { status: 500 }
            );
        }

        // Start the workflow
        const run = await start(workflowFunction, [body]);

        // Save run details (reusing logic from run route would be better, but duplicating for now)
        const runId = (run as any).id || `run-${Date.now()}`;

        try {
            const { saveRun } = await import('@/lib/run-store');
            await saveRun({
                id: runId,
                workflowName: sanitizedId,
                status: 'running',
                startTime: new Date().toISOString(),
                args: [body],
                logs: [{
                    timestamp: new Date().toISOString(),
                    level: 'info',
                    message: `Workflow '${sanitizedId}' triggered via webhook`
                }]
            });

            // Update status if completed immediately
            const { updateRunStatus } = await import('@/lib/run-store');
            await updateRunStatus(runId, 'completed', run);

        } catch (err) {
            console.error('Error saving run:', err);
        }

        return NextResponse.json({
            success: true,
            message: 'Workflow triggered successfully',
            runId,
            result: run
        });

    } catch (error) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to trigger workflow' },
            { status: 500 }
        );
    }
}
