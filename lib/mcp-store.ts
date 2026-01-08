import { createAdminClient } from '@/lib/supabase/server';

export interface McpServer {
    id: string;
    name: string;
    server_type: string;
    status: 'connected' | 'disconnected' | 'error';
    config?: any;
}

export interface McpTool {
    id: string;
    server_id: string;
    tool_name: string;
    display_name: string;
    description?: string;
    input_schema?: any;
}

export const mcpStore = {
    /**
     * List all connected servers for the current user
     */
    async listServers(): Promise<McpServer[]> {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('rune_mcp_servers')
            .select('*')
            .is('deleted_at', null);

        if (error) throw error;
        return data;
    },

    /**
     * Add or update an MCP server
     */
    async upsertServer(server: Partial<McpServer>): Promise<McpServer> {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('rune_mcp_servers')
            .upsert(server)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Sync tools for a server (Replace all tools for a server ID)
     */
    async syncTools(serverId: string, tools: Partial<McpTool>[]): Promise<void> {
        const supabase = createAdminClient();

        // 1. Delete existing tools for this server 
        // (Strategy: simpler to replace all than diffing for now)
        await supabase.from('rune_mcp_tools').delete().eq('server_id', serverId);

        // 2. Insert new tools
        if (tools.length > 0) {
            const toolsToInsert = tools.map(t => ({
                ...t,
                server_id: serverId
            }));

            const { error } = await supabase
                .from('rune_mcp_tools')
                .insert(toolsToInsert);

            if (error) throw error;
        }
    },

    /**
     * Get all enabled tools for an agent profile
     */
    async getEnabledTools(agentProfileId: string): Promise<McpTool[]> {
        const supabase = createAdminClient();

        // Join bindings -> tools
        const { data, error } = await supabase
            .from('rune_agent_tool_bindings')
            .select(`
        tool:rune_mcp_tools (*)
      `)
            .eq('agent_profile_id', agentProfileId)
            .eq('is_enabled', true);

        if (error) throw error;

        // Flatten result
        return data.map((d: any) => d.tool);
    }
};
