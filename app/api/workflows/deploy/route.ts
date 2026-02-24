import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const DEPRECATION_HEADERS = {
    Deprecation: 'true',
    Sunset: 'Tue, 30 Jun 2026 00:00:00 GMT',
    Link: '</api/rune/workflows/deploy>; rel="successor-version"',
    'X-Rune-Deprecated-Endpoint': '/api/workflows/deploy',
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}));
        let workflowId: string | null =
            body.workflow_id || body.workflowId || body.id || null;

        // Legacy payload used "slug" (workflow name). Resolve to ID for compatibility.
        if (!workflowId && body.slug) {
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401, headers: DEPRECATION_HEADERS },
                );
            }

            const { data: workflow } = await supabase
                .from('rune_workflows')
                .select('id')
                .eq('user_id', user.id)
                .eq('name', body.slug)
                .single();

            workflowId = workflow?.id ?? null;
        }

        if (!workflowId) {
            return NextResponse.json(
                { error: 'Missing workflow_id (or resolvable legacy slug)' },
                { status: 400, headers: DEPRECATION_HEADERS },
            );
        }

        const origin = new URL(req.url).origin;
        const response = await fetch(`${origin}/api/rune/workflows/deploy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                cookie: req.headers.get('cookie') ?? '',
            },
            body: JSON.stringify({
                workflow_id: workflowId,
                commit_message: body.commit_message || body.note,
            }),
        });

        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data, { status: response.status, headers: DEPRECATION_HEADERS });
    } catch (error) {
        console.error('Legacy deploy workflow error:', error);
        return NextResponse.json(
            { error: 'Failed to deploy workflow' },
            { status: 500, headers: DEPRECATION_HEADERS },
        );
    }
}
