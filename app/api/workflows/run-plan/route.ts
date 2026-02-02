import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { buildSubgraph } from '@/lib/agent-tools';
import { processIdempotency } from '@/lib/idempotency';

async function executeRunPlanLogic(payload: any) {
    const {
        workflowId,
        name,
        nodeIds,
        startNodes,
        endNodes,
        includeDependencies,
        inputOverrides
    } = payload || {};

    if (!workflowId && !name) {
        return NextResponse.json({ error: 'Missing workflowId or name' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Resolve workflow
    const workflowQuery = supabase
        .from('rune_workflows')
        .select('id, name, user_id');

    const { data: workflow, error: wfError } = workflowId
        ? await workflowQuery.eq('id', workflowId).single()
        : await workflowQuery.eq('name', name).single();

    if (wfError || !workflow) {
        return NextResponse.json(
            { error: `Workflow '${workflowId || name}' not found` },
            { status: 404 }
        );
    }

    // 2. Fetch latest version
    const { data: latestVersion, error: vError } = await supabase
        .from('rune_workflow_versions')
        .select('*')
        .eq('workflow_id', workflow.id)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

    if (vError || !latestVersion?.definition_json) {
        return NextResponse.json(
            { error: 'Workflow has no deployed versions' },
            { status: 404 }
        );
    }

    const graph = latestVersion.definition_json?.graph;
    if (!graph?.nodes || !graph?.edges) {
        return NextResponse.json(
            { error: 'Invalid workflow graph data' },
            { status: 500 }
        );
    }

    const { nodes, edges, startNodes: planStartNodes } = buildSubgraph(graph, {
        nodeIds,
        startNodes,
        endNodes,
        includeDependencies: includeDependencies ?? true,
        inputOverrides
    });

    if (!nodes.length || !planStartNodes.length) {
        return NextResponse.json(
            { error: 'No runnable nodes found for plan.' },
            { status: 400 }
        );
    }

    const engine = new WorkflowEngine(
        supabase,
        workflow.id,
        workflow.name,
        nodes,
        edges,
        workflow.user_id,
        latestVersion.id
    );

    const startQueue = planStartNodes.map((nodeId: string) => ({
        nodeId,
        input: inputOverrides?.[nodeId] || {}
    }));

    const runResult = await engine.runPlan(startQueue, { trigger: 'run_plan' });

    return NextResponse.json({
        success: true,
        message: 'Workflow plan executed successfully',
        runId: runResult.id,
        status: runResult.status,
        result: runResult.result
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const idempotencyKey = req.headers.get('idempotency-key');

        if (idempotencyKey) {
            return processIdempotency(
                {
                    key: idempotencyKey,
                    scope: 'run_plan',
                    params: {
                        workflowId: body?.workflowId || body?.name || 'unknown',
                        nodeCount: Array.isArray(body?.nodeIds) ? body.nodeIds.length : undefined,
                        startNodeCount: Array.isArray(body?.startNodes) ? body.startNodes.length : undefined
                    }
                },
                () => executeRunPlanLogic(body)
            );
        }

        return executeRunPlanLogic(body);
    } catch (error: any) {
        console.error('Error running workflow plan:', error);
        return NextResponse.json(
            { error: 'Failed to run workflow plan', details: error.message },
            { status: 500 }
        );
    }
}
