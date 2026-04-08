import { NextRequest, NextResponse } from 'next/server';
import { listSecretKeys } from '@/lib/secrets-manager';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';

/**
 * GET /api/secrets/list
 * Returns list of available secret keys (not values)
 * This is safe to call from the client as it only exposes keys
 */
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const keys = await listSecretKeys(user.id);

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
