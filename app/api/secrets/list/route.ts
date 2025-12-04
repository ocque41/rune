import { NextRequest, NextResponse } from 'next/server';
import { listSecretKeys } from '@/lib/secrets-manager';

/**
 * GET /api/secrets/list
 * Returns list of available secret keys (not values)
 * This is safe to call from the client as it only exposes keys
 */
export async function GET(request: NextRequest) {
    try {
        const keys = await listSecretKeys();

        return NextResponse.json({
            success: true,
            keys,
            count: keys.length
        });
    } catch (error) {
        console.error('Error listing secrets:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to list secrets',
                keys: []
            },
            { status: 500 }
        );
    }
}
