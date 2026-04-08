import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { AgentConfigSchema } from '@/lib/agent/types';

const DEFAULT_CONFIG = {
    model: 'gemini-1.5-flash',
    provider: 'google',
    temperature: 0.7,
    outputMode: 'text',
    tools: [],
    toolExecutionPolicy: 'confirm_high_impact',
    maxToolCalls: 10,
    maxSteps: 20,
    persistHistory: true,
    thinking: { enabled: false }
};

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: rows } = await supabase
        .from('rune_agent_configs')
        .select('scope_type, workflow_id, node_id, config')
        .eq('user_id', user.id);

    const userDefault = rows?.find((r: any) => r.scope_type === 'user_default')?.config || {};
    const workflowConfig = rows?.find((r: any) => r.scope_type === 'workflow' && r.workflow_id === workflowId)?.config || {};
    const merged = { ...DEFAULT_CONFIG, ...userDefault, ...workflowConfig };

    const parsed = AgentConfigSchema.safeParse(merged);
    return NextResponse.json(parsed.success ? parsed.data : merged);
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ workflowId: string }> }
) {
    const { workflowId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const merged = { ...DEFAULT_CONFIG, ...(body || {}) };
        const parsed = AgentConfigSchema.safeParse(merged);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid config payload' }, { status: 400 });
        }

        const { error } = await supabase
            .from('rune_agent_configs')
            .upsert({
                user_id: user.id,
                scope_type: 'workflow',
                workflow_id: workflowId,
                node_id: null,
                config: parsed.data
            }, {
                onConflict: 'user_id,scope_type,workflow_id,node_id'
            });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
