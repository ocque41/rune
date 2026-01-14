import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { processIdempotency } from '@/lib/idempotency';

async function executeRunLogic(name: string, args: any) {
    if (!name) {
        return NextResponse.json({ error: 'Missing workflow name' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Resolve workflow by name
    const { data: workflow, error: wfError } = await supabase
        .from('rune_workflows')
        .select('id, name')
        .eq('name', name)
        .single();

    if (wfError || !workflow) {
        return NextResponse.json(
            { error: `Workflow '${name}' not found` },
            { status: 404 }
        );
    }

    // 2. Fetch Latest Version
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

    const graph = latestVersion.definition_json?.graph; // Production uses definition_json.graph

    // 3. Execution
    const engine = new WorkflowEngine(
        supabase,
        workflow.id,
        workflow.name,
        graph.nodes || [],
        graph.edges || [],
        latestVersion.id // Pass version ID
    );

    // Map args array to initial payload
    const inputPayload = Array.isArray(args) ? { args } : (args || {});

    const runResult = await engine.run(inputPayload);

    return NextResponse.json({
        success: true,
        message: 'Workflow executed successfully',
        runId: runResult.id,
        result: runResult.result
    });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const { name, args } = body;
        const idempotencyKey = req.headers.get('idempotency-key');

        if (idempotencyKey) {
            return processIdempotency(
                {
                    key: idempotencyKey,
                    scope: 'start_run',
                    params: { name, argsCount: Array.isArray(args) ? args.length : 'object' }
                },
                () => executeRunLogic(name, args)
            );
        }

        return executeRunLogic(name, args);

    } catch (error: any) {
        console.error('Error running workflow:', error);
        return NextResponse.json(
            { error: 'Failed to run workflow', details: error.message },
            { status: 500 }
        );
    }
}

