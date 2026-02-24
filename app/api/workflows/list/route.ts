import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeWorkflowMode, normalizeWorkflowModeConfig } from '@/lib/workflow/modes';

const DEPRECATION_HEADERS = {
    Deprecation: 'true',
    Sunset: 'Tue, 30 Jun 2026 00:00:00 GMT',
    Link: '</api/rune/workflows>; rel="successor-version"',
    'X-Rune-Deprecated-Endpoint': '/api/workflows/list',
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: DEPRECATION_HEADERS },
            );
        }

        const url = new URL(req.url);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);

        const { data, error } = await supabase
            .from('rune_workflows')
            .select('id, name, description, updated_at, workflow_mode, workflow_mode_config')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        return NextResponse.json({
            workflows: (data || []).map((workflow: any) => {
                const mode = normalizeWorkflowMode(workflow.workflow_mode);
                return {
                    ...workflow,
                    workflow_mode: mode,
                    workflow_mode_config: normalizeWorkflowModeConfig(mode, workflow.workflow_mode_config),
                };
            }),
        }, { headers: DEPRECATION_HEADERS });
    } catch (error) {
        console.error('Legacy list workflows error:', error);
        return NextResponse.json(
            { error: 'Failed to list workflows' },
            { status: 500, headers: DEPRECATION_HEADERS },
        );
    }
}
