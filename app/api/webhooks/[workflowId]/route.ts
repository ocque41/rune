import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { processIdempotency } from '@/lib/idempotency';
import { verifySignature } from '@/lib/autonomy/security';

async function validateWebhookSignature(workflowId: string, rawPayload: string, signature: string | null) {
    if (!signature) {
        return { ok: false, status: 401, error: 'Missing X-Rune-Signature header' };
    }

    const supabase = createAdminClient();
    const { data: workflow, error } = await supabase
        .from('rune_workflows')
        .select('id, user_id, webhook_secret')
        .eq('id', workflowId)
        .single();

    if (error || !workflow) {
        return { ok: false, status: 404, error: 'Workflow not found' };
    }

    if (workflow.webhook_secret && verifySignature(rawPayload, workflow.webhook_secret, signature)) {
        return { ok: true, workflow };
    }

    // Backward compatibility: endpoint secrets
    const { data: endpoints } = await supabase
        .from('rune_webhook_endpoints')
        .select('secret_hash')
        .eq('workflow_id', workflowId)
        .eq('is_active', true);

    const endpointMatch = (endpoints || []).some((ep: any) =>
        verifySignature(rawPayload, ep.secret_hash, signature)
    );

    if (!endpointMatch) {
        return { ok: false, status: 401, error: 'Invalid signature' };
    }

    return { ok: true, workflow };
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params;
    const idempotencyKey = request.headers.get('idempotency-key');
    const signature = request.headers.get('x-rune-signature');

    const rawBody = await request.text();
    let payload: any = {};
    try {
        payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const signatureValidation = await validateWebhookSignature(workflowId, rawBody, signature);
    if (!signatureValidation.ok) {
        return NextResponse.json(
            { success: false, error: signatureValidation.error },
            { status: signatureValidation.status }
        );
    }

    if (idempotencyKey) {
        return processIdempotency(
            { key: idempotencyKey, scope: 'webhook_run', params: { workflowId } },
            () => handleWorkflowTrigger(workflowId, payload)
        );
    }

    return handleWorkflowTrigger(workflowId, payload);
}

export async function GET() {
    return NextResponse.json(
        { success: false, error: 'GET is not supported on this webhook endpoint' },
        { status: 405 }
    );
}

async function handleWorkflowTrigger(workflowId: string, payload: any) {
    try {
        if (!workflowId) {
            return NextResponse.json(
                { success: false, error: 'Workflow ID is required' },
                { status: 400 }
            );
        }

        const supabase = createAdminClient();

        const { data: latestVersion, error } = await supabase
            .from('rune_workflow_versions')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        if (error || !latestVersion) {
            return NextResponse.json(
                { success: false, error: 'Workflow not found or not deployed' },
                { status: 404 }
            );
        }

        const graph = latestVersion.definition_json?.graph;
        if (!graph || !graph.nodes || !graph.edges) {
            return NextResponse.json(
                { success: false, error: 'Invalid workflow graph data' },
                { status: 500 }
            );
        }

        const { data: wfMeta } = await supabase
            .from('rune_workflows')
            .select('name, user_id, workflow_mode, workflow_mode_config')
            .eq('id', workflowId)
            .single();

        const workflowName = wfMeta?.name || 'Unknown Workflow';
        const workflowUserId = wfMeta?.user_id;

        const engine = new WorkflowEngine(
            supabase,
            workflowId,
            workflowName,
            graph.nodes,
            graph.edges,
            workflowUserId,
            latestVersion.id,
            latestVersion.workflow_mode || wfMeta?.workflow_mode || latestVersion.definition_json?.workflow_mode,
            latestVersion.workflow_mode_config || wfMeta?.workflow_mode_config || latestVersion.definition_json?.workflow_mode_config,
        );

        const webhookNode = graph.nodes.find((n: any) => n.type === 'webhook');
        const triggerNodeId = webhookNode?.id;

        if (!triggerNodeId) {
            return NextResponse.json(
                { success: false, error: 'No Webhook trigger found in this workflow' },
                { status: 400 }
            );
        }

        const runResult = await engine.run(payload, triggerNodeId);

        return NextResponse.json({
            success: true,
            message: 'Workflow executed successfully',
            runId: runResult.id,
            result: runResult.result
        });
    } catch (error: any) {
        console.error('Webhook error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to trigger workflow' },
            { status: 500 }
        );
    }
}
