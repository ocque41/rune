import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { NextRequest, NextResponse } from 'next/server';
import { PlaygroundSnapshot } from '@/lib/types/agent';

export async function POST(req: NextRequest) {
    try {
        const snapshot: PlaygroundSnapshot = await req.json();
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Basic validation
        if (!snapshot.config || !snapshot.messages) {
            return NextResponse.json({ error: 'Invalid snapshot data' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('rune_playground_snapshots')
            .insert({
                config: snapshot.config,
                messages: snapshot.messages,
                graph_state: snapshot.graphState,
                user_id: user.id
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving snapshot:', error);
            // If table doesn't exist, we might get an error here.
            // For now, return error 500
            return NextResponse.json({ error: 'Failed to save snapshot to database' }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data.id });

    } catch (e) {
        console.error('Snapshot API Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
