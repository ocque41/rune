'use server';

import { createClient } from '@/lib/supabase/server';
import { AgentConfig, AgentConfigSchema } from '@/lib/agent/types';
import { revalidatePath } from 'next/cache';

const DEFAULT_CONFIG: AgentConfig = {
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

export async function getEffectiveAgentConfig(workflowId?: string, nodeId?: string): Promise<AgentConfig> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return DEFAULT_CONFIG;

    try {
        // Fetch all relevant configs in one query is hard due to OR conditions on mismatched columns.
        // Easier to fetch where user_id = me.
        const { data: configs } = await supabase
            .from('rune_agent_configs')
            .select('*')
            .eq('user_id', user.id);

        if (!configs) return DEFAULT_CONFIG;

        // Find specific scope configs
        const userDefault = configs.find((c: any) => c.scope_type === 'user_default');
        const workflowConfig = workflowId ? configs.find((c: any) => c.scope_type === 'workflow' && c.workflow_id === workflowId) : null;
        const nodeConfig = nodeId ? configs.find((c: any) => c.scope_type === 'node' && c.node_id === nodeId) : null;

        // Merge Strategy: Default -> User Default -> Workflow -> Node
        // Note: DB stores partial configs potentially? Schema says 'config' column is JSONB.
        // Zod Schema is Partial friendly? 
        // AgentConfig is the FULL config. 
        // We should treat DB config as Partial updates or Full replacements?
        // Typically overrides are Partial. 

        let finalConfig = { ...DEFAULT_CONFIG };

        if (userDefault?.config) Object.assign(finalConfig, userDefault.config);
        if (workflowConfig?.config) Object.assign(finalConfig, workflowConfig.config);
        if (nodeConfig?.config) Object.assign(finalConfig, nodeConfig.config);

        // Sanitize with Schema (fills defaults if missing and valid types)
        const parsed = AgentConfigSchema.safeParse(finalConfig);
        if (parsed.success) {
            return parsed.data;
        } else {
            console.error('Invalid merged config:', parsed.error);
            return finalConfig;
        }

    } catch (e) {
        console.error('Failed to load agent config:', e);
        return DEFAULT_CONFIG;
    }
}

export async function saveAgentConfig(
    scope: 'user_default' | 'workflow' | 'node',
    config: Partial<AgentConfig>,
    workflowId?: string,
    nodeId?: string
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    // Validate Scope Args
    if (scope === 'workflow' && !workflowId) throw new Error('Workflow ID required for workflow scope');
    if (scope === 'node' && !nodeId) throw new Error('Node ID required for node scope');

    // We merge with current config to ensure we save what is intended, OR we just save the partial?
    // Storing Full Config allows independence. Storing Partial allows inheritance.
    // Let's store what is passed.

    const configToSave = config;

    // Prepare Upsert Data
    const upsertData: any = {
        user_id: user.id,
        scope_type: scope,
        config: configToSave,
        updated_at: new Date().toISOString()
    };

    if (workflowId) upsertData.workflow_id = workflowId;
    if (nodeId) upsertData.node_id = nodeId;

    // We need to match the unique constraint to Upsert.
    // Constraint is likely (user_id, scope_type, workflow_id, node_id) 
    // OR distinct constraints for each scope.
    // My migration didn't explicitly name a unique constraint, but typically we want one.
    // Let's check if collision happens. `upsert` needs `onConflict`.
    // Valid onConflict columns: user_id, scope_type, workflow_id, node_id.
    // But workflow_id is null for user_default.

    // Logic: Look for existing, then update or insert.
    // Supabase upsert requires a unique constraint.
    // If I didn't create one, I should simple Select then Insert/Update or just use ID not available?

    // Let's try to query first.
    let query = supabase.from('rune_agent_configs')
        .select('id')
        .eq('user_id', user.id)
        .eq('scope_type', scope);

    if (workflowId) query = query.eq('workflow_id', workflowId);
    else query = query.is('workflow_id', null);

    if (nodeId) query = query.eq('node_id', nodeId);
    else query = query.is('node_id', null);

    const { data: existing } = await query.single();

    if (existing) {
        const { error } = await supabase
            .from('rune_agent_configs')
            .update({ config: configToSave, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        if (error) throw error;
    } else {
        const { error } = await supabase
            .from('rune_agent_configs')
            .insert(upsertData);
        if (error) throw error;
    }

    revalidatePath('/playground');
    return { success: true };
}
