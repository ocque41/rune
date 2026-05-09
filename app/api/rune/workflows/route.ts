import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withTrace } from '@/lib/trace';
import {
    normalizeWorkflowMode,
    normalizeWorkflowModeConfig,
} from '@/lib/workflow/modes';
import { assertNoInlineSecrets } from '@/lib/security/secrets-policy';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    return withTrace('api.rune.workflows.upsert', async () => {
        try {
            const authClient = await createClient();
            const { data: { user }, error: authError } = await authClient.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }

            const body = await req.json();
            const {
                id,
                name,
                description,
                graph,
                graph_json,
                code,
                workflow_mode,
                workflow_mode_config,
            } = body || {};

            const graphPayload = graph ?? graph_json;
            if (!name || !graphPayload || !code) {
                return NextResponse.json(
                    { error: 'Missing required fields: name, graph, code' },
                    { status: 400 },
                );
            }

            assertNoInlineSecrets({ graph: graphPayload, code }, 'Workflow save');

            const mode = normalizeWorkflowMode(workflow_mode);
            const modeConfig = normalizeWorkflowModeConfig(mode, workflow_mode_config);

            const supabase = createAdminClient();
            const { data: productData, error: productError } = await supabase
                .from('ecosystem_products')
                .select('id')
                .eq('product_key', 'rune')
                .single();

            if (productError || !productData) {
                return NextResponse.json({ error: "Product 'rune' not found" }, { status: 500 });
            }

            const workflowData = {
                name,
                description: description ?? null,
                graph_json: graphPayload,
                code,
                product_id: productData.id,
                user_id: user.id,
                workflow_mode: mode,
                workflow_mode_config: modeConfig,
                updated_at: new Date().toISOString(),
            };

            let result: any = null;
            if (id) {
                const { data, error } = await supabase
                    .from('rune_workflows')
                    .update(workflowData)
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .select('*')
                    .single();

                if (error) throw error;
                result = data;
            } else {
                const { data, error } = await supabase
                    .from('rune_workflows')
                    .insert([{ ...workflowData, created_at: new Date().toISOString() }])
                    .select('*')
                    .single();

                if (error) throw error;
                result = data;
            }

            return NextResponse.json({
                success: true,
                workflow: {
                    ...result,
                    workflow_mode: mode,
                    workflow_mode_config: modeConfig,
                },
            });
        } catch (error: unknown) {
            console.error('Save workflow error:', error);
            const message = error instanceof Error ? error.message : 'Failed to save workflow';
            return NextResponse.json({ error: message }, { status: 500 });
        }
    });
}

export async function GET(req: NextRequest) {
    return withTrace('api.rune.workflows.list', async () => {
        try {
            const supabase = await createClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
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

            const workflows = (data || []).map((workflow: any) => {
                const mode = normalizeWorkflowMode(workflow.workflow_mode);
                return {
                    ...workflow,
                    workflow_mode: mode,
                    workflow_mode_config: normalizeWorkflowModeConfig(mode, workflow.workflow_mode_config),
                };
            });

            return NextResponse.json({ workflows });
        } catch (error: unknown) {
            console.error('List workflows error:', error);
            return NextResponse.json(
                { error: 'Failed to list cloud workflows' },
                { status: 500 },
            );
        }
    });
}
