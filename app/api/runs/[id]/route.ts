import { NextRequest, NextResponse } from 'next/server';
import { getRun } from '@/lib/run-store';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'Run ID is required' },
                { status: 400 }
            );
        }

        const run = await getRun(id);

        if (!run) {
            return NextResponse.json(
                { success: false, error: 'Run not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, run });
    } catch (error) {
        console.error('Error getting run:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get run details' },
            { status: 500 }
        );
    }
}
