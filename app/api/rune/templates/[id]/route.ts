import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createAdminClient();

        const { error } = await supabase
            .from('rune_user_templates')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete template error:', error);
        return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }
}
