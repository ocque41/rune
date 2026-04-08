'use server';

import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { TOOLS_DEFINITION } from '@/lib/agent-tools';
import { getToolCapability, isToolImplemented } from '@/lib/agent/tools-metadata';

export type AgentToolType = 'system' | 'mcp';

export interface AgentToolDef {
    id: string;
    label: string;
    description: string;
    type: AgentToolType;
    serverName?: string; // For MCP tools
    icon?: string;
    enabled: boolean;
}

export async function getAvailableTools() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { tools: [] };

    // 1. Get System Tools (hardcoded for now, but could be DB driven later)
    // Map internal function names to UI friendly objects
    const systemTools: AgentToolDef[] = TOOLS_DEFINITION.map(tool => {
        const capability = getToolCapability(tool.function.name);
        const baseDescription = tool.function.description.split('\n')[0];
        return {
            id: tool.function.name,
            label: formatToolName(tool.function.name),
            description: capability === 'implemented' ? baseDescription : `${baseDescription} (${capability})`,
            type: 'system',
            enabled: isToolImplemented(tool.function.name),
        };
    });

    // 2. Get MCP Tools from DB
    // We fetch enabled tools from servers that are connected
    const { data: mcpTools } = await supabase
        .from('rune_mcp_tools')
        .select(`
            tool_name,
            description,
            server_id,
            rune_mcp_servers!inner (
                user_id,
                name,
                status
            )
        `)
        .eq('rune_mcp_servers.status', 'connected')
        .eq('rune_mcp_servers.user_id', user.id);

    const externalTools: AgentToolDef[] = (mcpTools || []).map((t: any) => ({
        id: `mcp:${t.server_id}:${t.tool_name}`,
        label: t.tool_name,
        description: t.description || 'External MCP Tool',
        type: 'mcp',
        serverName: t.rune_mcp_servers.name,
        enabled: false
    }));

    // Grouping happens at UI level, we just return flat list
    return {
        tools: [...systemTools, ...externalTools]
    };
}

function formatToolName(name: string): string {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
