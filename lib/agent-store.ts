import { SupabaseClient } from '@supabase/supabase-js';
import { LLMConfig } from '@/lib/types/agent';

// Return type matching frontend expectations
export type AgentProfile = LLMConfig;

export const agentStore = {
    /**
     * Get agent profile for a workflow
     */
    async getProfile(supabase: SupabaseClient, workflowId: string): Promise<AgentProfile | null> {
        const { data, error } = await supabase
            .from('rune_agent_profiles')
            .select('*')
            .eq('workflow_id', workflowId)
            .single();

        if (error || !data) return null;

        // Map snake_case DB fields to camelCase LLMConfig
        return {
            model: data.model,
            temperature: data.temperature,
            systemPrompt: data.system_prompt,
            topP: data.top_p,
            // Restore tools from metadata if available, or fetch bindings (TODO)
            tools: data.config_metadata?.tools || [],
            // Defaults for new fields
            provider: 'google',
            outputMode: 'text',
            toolExecutionPolicy: 'confirm_high_impact',
            maxToolCalls: 5,
            maxTokens: 2000,
            responseSchema: undefined,
            maxSteps: 20,
            persistHistory: true
        };
    },

    /**
     * Create or update agent profile
     */
    async updateProfile(supabase: SupabaseClient, workflowId: string, userId: string, config: Partial<LLMConfig>): Promise<void> {

        const profileData: any = {
            workflow_id: workflowId,
            user_id: userId,
            updated_at: new Date().toISOString()
        };

        if (config.model) profileData.model = config.model;
        if (config.temperature !== undefined) profileData.temperature = config.temperature;
        if (config.topP !== undefined) profileData.top_p = config.topP;
        if (config.systemPrompt) profileData.system_prompt = config.systemPrompt;

        // Save tools list to metadata for easy UI restore 
        // (Real enforcement happens via tool bindings table, which we'd update here too if needed)
        if (config.tools) {
            profileData.config_metadata = { tools: config.tools };
        }

        const { error } = await supabase
            .from('rune_agent_profiles')
            .upsert(profileData, { onConflict: 'workflow_id' });

        if (error) throw error;
    }
};
