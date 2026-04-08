'use server'

import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { revalidatePath } from 'next/cache'

export type McpServer = {
    id: string
    name: string
    server_type: 'stdio' | 'sse'
    status: 'connected' | 'disconnected' | 'error'
    config: any
    rune_mcp_tools?: McpTool[]
    error_message?: string
}

export type McpTool = {
    id: string
    tool_name: string
    display_name: string
    description: string | null
}

export async function getMcpServers() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('rune_mcp_servers')
        .select('*, rune_mcp_tools(*)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

    return (data || []) as McpServer[]
}

export async function addMcpServer(data: {
    name: string
    type: 'sse' // Enforce SSE only
    url: string
    env?: Record<string, string>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Validation
    if (!data.name) throw new Error('Name is required')
    if (data.type !== 'sse' || !data.url) throw new Error('Valid SSE URL is required')

    // Config object to store connection details
    const config = {
        url: data.url,
        env: data.env || {}
    }

    // 1. Create Server
    const { data: server, error } = await supabase
        .from('rune_mcp_servers')
        .insert({
            user_id: user.id,
            name: data.name,
            server_type: data.type,
            status: 'connected', // Optimistic connection for MVP
            config,
            last_verified_at: new Date().toISOString()
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to add MCP server', error)
        throw new Error('Failed to create server record')
    }

    // 2. Discover Tools (Simulated for MVP until Real MCP Client is ready)
    // In a real app, we would: await mcpClient.connect(config).listTools()
    const tools = simulateToolDiscovery(data.name, data.type)

    if (tools.length > 0) {
        const toolsToInsert = tools.map(t => ({
            server_id: server.id,
            tool_name: t,
            display_name: formatToolName(t),
            category: 'general',
            description: `Tool provided by ${data.name}`
        }))

        const { error: toolsError } = await supabase
            .from('rune_mcp_tools')
            .insert(toolsToInsert)

        if (toolsError) {
            console.error('Failed to insert tools', toolsError)
            // Non-fatal, we just won't see tools yet
        }
    }

    revalidatePath('/')
    return server
}

export async function deleteMcpServer(serverId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Soft delete
    const { error } = await supabase
        .from('rune_mcp_servers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', serverId)
        .eq('user_id', user.id)

    if (error) throw error
    revalidatePath('/')
}

export async function toggleMcpServerConnection(serverId: string, currentStatus: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected'

    const { error } = await supabase
        .from('rune_mcp_servers')
        .update({
            status: newStatus,
            last_verified_at: newStatus === 'connected' ? new Date().toISOString() : undefined
        })
        .eq('id', serverId)
        .eq('user_id', user.id)

    if (error) throw error
    revalidatePath('/')
    return newStatus
}

// --- Helpers ---

function simulateToolDiscovery(name: string, type: string): string[] {
    const n = name.toLowerCase()

    // Heuristics based on name to make it feel real
    if (n.includes('git')) return ['git_status', 'git_commit', 'git_push', 'git_log', 'git_diff']
    if (n.includes('github')) return ['create_issue', 'list_pull_requests', 'get_repository', 'search_code']
    if (n.includes('postgres') || n.includes('sql') || n.includes('db')) return ['execute_query', 'list_tables', 'describe_table', 'explain_plan']
    if (n.includes('file') || n.includes('fs')) return ['list_directory', 'read_file', 'write_file', 'search_files', 'get_file_info']
    if (n.includes('search') || n.includes('brave') || n.includes('google')) return ['search_web', 'get_weather', 'get_news']
    if (n.includes('slack')) return ['send_message', 'list_channels', 'read_history', 'upload_file']
    if (n.includes('linear')) return ['create_issue', 'get_issue', 'update_status', 'list_teams']

    if (type === 'stdio') return ['execute_command', 'get_system_info']
    return ['fetch_data', 'ping']
}

function formatToolName(snake: string) {
    return snake.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}
