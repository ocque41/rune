import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { email, code } = await req.json();

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch record
        const { data: record, error: fetchError } = await supabase
            .from('verified_senders')
            .select('*')
            .eq('email', email)
            .eq('owner_id', user.id)
            .single();

        if (fetchError || !record) {
            return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
        }

        if (record.verification_code !== code) {
            return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
        }

        // Mark as verified
        const { error: updateError } = await supabase
            .from('verified_senders')
            .update({
                status: 'verified',
                verification_code: null // Clear code after use
            })
            .eq('id', record.id);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Verification failed:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
