import { NextResponse } from 'next/server';
import { mcpStore } from '@/lib/mcp-store';

export async function GET() {
    try {
        const tools = await mcpStore.listAllTools();

        // Map to frontend interface
        const mapped = tools.map(t => ({
            id: t.id,
            name: t.display_name || t.tool_name,
            description: t.description || 'No description provided',
            source: t.source || 'System'
        }));

        return NextResponse.json(mapped);
    } catch (e: any) {
        console.error("Failed to list tools", e);
        return NextResponse.json({ error: 'Failed to list tools' }, { status: 500 });
    }
}
