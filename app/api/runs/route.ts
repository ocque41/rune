import { NextResponse } from 'next/server';
import { listRuns } from '@/lib/run-store';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const runs = await listRuns();
        return NextResponse.json({ success: true, runs });
    } catch (error) {
        console.error('Error listing runs:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to list runs' },
            { status: 500 }
        );
    }
}
