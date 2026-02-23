import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        if (process.env.NODE_ENV === 'production') {
            return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
        }

        const authClient = await createClient();
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { code, filename } = await req.json();

        if (!code || !filename) {
            return NextResponse.json(
                { error: 'Missing code or filename' },
                { status: 400 }
            );
        }

        // Sanitize filename to get the slug
        const slug = filename.replace(/\.ts$/, '').replace(/[^a-zA-Z0-9_-]/g, '');
        const workflowsDir = path.join(process.cwd(), 'workflows');
        const workflowDir = path.join(workflowsDir, slug);
        const draftPath = path.join(workflowDir, 'draft.ts');
        const legacyPath = path.join(workflowsDir, `${slug}.ts`);

        // Ensure workflows directory exists
        try {
            await fs.access(workflowsDir);
        } catch {
            await fs.mkdir(workflowsDir, { recursive: true });
        }

        // Check if directory exists
        let dirExists = false;
        try {
            await fs.access(workflowDir);
            dirExists = true;
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                throw new Error(`Failed to access workflow directory: ${e.message}`);
            }
            // Directory doesn't exist, proceed to create
        }

        // Migration Logic: If directory doesn't exist but legacy file does
        if (!dirExists) {
            let legacyExists = false;
            try {
                await fs.access(legacyPath);
                legacyExists = true;
            } catch {
                // Legacy file doesn't exist
            }

            // Create directory
            await fs.mkdir(workflowDir, { recursive: true });
            await fs.mkdir(path.join(workflowDir, 'versions'), { recursive: true });

            if (legacyExists) {
                // Move legacy file to draft.ts
                const legacyContent = await fs.readFile(legacyPath, 'utf-8');
                await fs.writeFile(draftPath, legacyContent, 'utf-8');

                // Also create prod.ts from legacy content to maintain compatibility
                await fs.writeFile(path.join(workflowDir, 'prod.ts'), legacyContent, 'utf-8');

                // Initialize meta.json
                await fs.writeFile(path.join(workflowDir, 'meta.json'), JSON.stringify({
                    latestVersion: 1,
                    prodVersion: 1,
                    history: [{ version: 1, timestamp: new Date().toISOString(), note: 'Migrated from legacy file' }]
                }, null, 2), 'utf-8');

                // Create v1.ts
                await fs.writeFile(path.join(workflowDir, 'versions', 'v1.ts'), legacyContent, 'utf-8');

                // Remove legacy file
                await fs.unlink(legacyPath);
            } else {
                // New workflow, just init meta
                await fs.writeFile(path.join(workflowDir, 'meta.json'), JSON.stringify({
                    latestVersion: 0,
                    prodVersion: 0,
                    history: []
                }, null, 2), 'utf-8');
            }
        }

        // Save the new code to draft.ts
        await fs.writeFile(draftPath, code, 'utf-8');

        return NextResponse.json({ success: true, path: draftPath });
    } catch (error: any) {
        console.error('Error saving workflow:', error);
        return NextResponse.json(
            { error: `Failed to save workflow: ${error.message}` },
            { status: 500 }
        );
    }
}
