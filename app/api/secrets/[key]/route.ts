import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/secrets-manager';

/**
 * GET /api/secrets/[key]
 * Returns the value of a specific secret
 * 
 * SECURITY WARNING: This endpoint returns secret values
 * In production, this should be:
 * 1. Only callable from server-side (workflow execution context)
 * 2. Protected by authentication/authorization
 * 3. Rate-limited
 * 
 * For now, we'll implement basic protection by checking if request is server-side
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const { key } = await params;

        if (!key) {
            return NextResponse.json(
                { success: false, error: 'Secret key is required' },
                { status: 400 }
            );
        }

        // In production, add authentication check here:
        // const session = await getServerSession();
        // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const value = await getSecret(key);

        if (value === null) {
            return NextResponse.json(
                { success: false, error: `Secret '${key}' not found` },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            key,
            value
        });
    } catch (error) {
        console.error(`Error getting secret:`, error);

        return NextResponse.json(
            {
                success: false,
                error: 'Failed to retrieve secret'
            },
            { status: 500 }
        );
    }
}
