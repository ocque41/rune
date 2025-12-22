import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Sender ID is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Delete the sender
        // RLS policies ensure users can only delete their own records
        const { error: deleteError } = await supabase
            .from('verified_senders')
            .delete()
            .eq('id', id)
            .eq('owner_id', user.id); // Redundant if RLS is on, but safe

        if (deleteError) throw deleteError;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete sender failed:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
