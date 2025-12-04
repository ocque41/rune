import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const { slug } = await req.json();

        if (!slug) {
            return NextResponse.json(
                { error: 'Missing workflow slug' },
                { status: 400 }
            );
        }

        const workflowsDir = path.join(process.cwd(), 'workflows');
        const workflowDir = path.join(workflowsDir, slug);
        const draftPath = path.join(workflowDir, 'draft.ts');
        const metaPath = path.join(workflowDir, 'meta.json');
        const versionsDir = path.join(workflowDir, 'versions');

        // Check if draft exists
        try {
            await fs.access(draftPath);
        } catch {
            return NextResponse.json(
                { error: 'Draft not found. Save the workflow first.' },
                { status: 404 }
            );
        }

        // Read draft content
        const draftContent = await fs.readFile(draftPath, 'utf-8');

        // Read or init meta
        let meta = { latestVersion: 0, prodVersion: 0, history: [] as any[] };
        try {
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            meta = JSON.parse(metaContent);
        } catch {
            // Meta missing, use default
        }

        // Increment version
        const newVersion = meta.latestVersion + 1;
        const versionFilename = `v${newVersion}.ts`;
        const versionPath = path.join(versionsDir, versionFilename);

        // Ensure versions dir exists
        await fs.mkdir(versionsDir, { recursive: true });

        // Save version snapshot
        await fs.writeFile(versionPath, draftContent, 'utf-8');

        // Update prod.ts
        const prodPath = path.join(workflowDir, 'prod.ts');
        await fs.writeFile(prodPath, draftContent, 'utf-8');

        // Update meta
        meta.latestVersion = newVersion;
        meta.prodVersion = newVersion;
        meta.history.unshift({
            version: newVersion,
            timestamp: new Date().toISOString(),
            note: 'Deployed via UI'
        });

        await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf-8');

        return NextResponse.json({
            success: true,
            version: newVersion,
            message: `Deployed version ${newVersion}`
        });

    } catch (error) {
        console.error('Error deploying workflow:', error);
        return NextResponse.json(
            { error: 'Failed to deploy workflow' },
            { status: 500 }
        );
    }
}
