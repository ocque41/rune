
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { workflowStore } from '@/lib/workflow-store';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();

        // Use store - handles column mapping and check RLS
        const workflow = await workflowStore.getWorkflow(supabase, id);

        if (!workflow) {
            return NextResponse.json({ error: 'Workflow not found or access denied' }, { status: 404 });
        }

        return NextResponse.json({ workflow });

    } catch (error: any) {
        console.error('Get workflow error:', error);
        return NextResponse.json(
            { error: 'Failed to get workflow' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ error: 'Missing workflow ID' }, { status: 400 });
        }

        const supabase = await createClient();

        await workflowStore.deleteWorkflow(supabase, id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete workflow error:', error);
        return NextResponse.json(
            { error: 'Failed to delete workflow' },
            { status: 500 }
        );
    }
}
