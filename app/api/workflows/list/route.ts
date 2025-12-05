import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const workflowsDir = path.join(process.cwd(), 'workflows');

        try {
            await fs.access(workflowsDir);
        } catch {
            return NextResponse.json({ workflows: [] });
        }

        const entries = await fs.readdir(workflowsDir, { withFileTypes: true });

        // Filter for directories (workflow bundles)
        // Also look for legacy single TS files just in case, though we prefer directories now
        const workflows = entries
            .filter(entry => entry.isDirectory())
            .map(entry => ({
                id: entry.name,
                name: entry.name, // Slug as name for now
                type: 'local'
            }));

        return NextResponse.json({ workflows });
    } catch (error) {
        console.error('Error listing local workflows:', error);
        return NextResponse.json(
            { error: 'Failed to list workflows' },
            { status: 500 }
        );
    }
}
