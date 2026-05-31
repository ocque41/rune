import { NextRequest, NextResponse } from 'next/server';
import { getSecret } from '@/lib/secrets-manager';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';

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
    _request: NextRequest,
    { params }: { params: Promise<{ key: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { key } = await params;

        if (!key) {
            return NextResponse.json(
                { success: false, error: 'Secret key is required' },
                { status: 400 }
            );
        }

        const value = await getSecret(key, user.id);

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
