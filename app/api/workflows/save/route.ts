import { NextRequest, NextResponse } from 'next/server';
import { normalizeWorkflowMode, normalizeWorkflowModeConfig } from '@/lib/workflow/modes';

const DEPRECATION_HEADERS = {
    Deprecation: 'true',
    Sunset: 'Tue, 30 Jun 2026 00:00:00 GMT',
    Link: '</api/rune/workflows>; rel="successor-version"',
    'X-Rune-Deprecated-Endpoint': '/api/workflows/save',
};

function deriveWorkflowName(payload: any): string {
    if (typeof payload?.name === 'string' && payload.name.trim().length > 0) {
        return payload.name.trim();
    }

    if (typeof payload?.filename === 'string' && payload.filename.trim().length > 0) {
        return payload.filename.replace(/\.ts$/i, '').trim();
    }

    return 'Untitled Workflow';
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        const mode = normalizeWorkflowMode(body.workflow_mode);
        const modeConfig = normalizeWorkflowModeConfig(mode, body.workflow_mode_config);

        const payload = {
            id: body.id,
            name: deriveWorkflowName(body),
            description: body.description ?? 'Saved through legacy /api/workflows/save wrapper',
            graph: body.graph ?? body.graph_json ?? { nodes: [], edges: [] },
            code: body.code ?? '',
            workflow_mode: mode,
            workflow_mode_config: modeConfig,
        };

        const origin = new URL(req.url).origin;
        const response = await fetch(`${origin}/api/rune/workflows`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                cookie: req.headers.get('cookie') ?? '',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(
            {
                ...data,
                path: data.workflow?.id ? `/api/rune/workflows/${data.workflow.id}` : undefined,
            },
            { status: response.status, headers: DEPRECATION_HEADERS },
        );
    } catch (error: any) {
        console.error('Legacy save workflow error:', error);
        return NextResponse.json(
            { error: `Failed to save workflow: ${error.message}` },
            { status: 500, headers: DEPRECATION_HEADERS },
        );
    }
}
