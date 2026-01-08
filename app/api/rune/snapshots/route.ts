import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { PlaygroundSnapshot } from '@/lib/types/agent';

export async function POST(req: NextRequest) {
    try {
        const snapshot: PlaygroundSnapshot = await req.json();
        const supabase = createAdminClient();

        // Basic validation
        if (!snapshot.config || !snapshot.messages) {
            return NextResponse.json({ error: 'Invalid snapshot data' }, { status: 400 });
        }

        // In a real app we'd get the user from the session
        // const { data: { user } } = await supabase.auth.getUser();
        // const userId = user?.id;

        const { data, error } = await supabase
            .from('rune_playground_snapshots')
            .insert({
                config: snapshot.config,
                messages: snapshot.messages,
                graph_state: snapshot.graphState,
                // user_id: userId // if auth is working
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
