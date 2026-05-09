import { NextRequest, NextResponse } from 'next/server';
import { assertNoInlineSecrets } from '@/lib/security/secrets-policy';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { data, filename } = body;

        if (!data || !filename) {
            return NextResponse.json(
                { error: 'Missing data or filename' },
                { status: 400 }
            );
        }

        assertNoInlineSecrets(data, 'Workflow export');

        // Create the JSON content
        const json = JSON.stringify(data, null, 2);

        // Return as a downloadable file with proper headers
        return new NextResponse(json, {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: 'Failed to export workflow' },
            { status: 500 }
        );
    }
}
