import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const { email, host, port, user, pass, secure } = await req.json();

        if (!email || !host || !port || !user || !pass) {
            return NextResponse.json({ error: 'All SMTP fields are required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Verify credentials by attempting a connection
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port),
            secure: secure === true,
            auth: { user, pass },
        });

        try {
            await transporter.verify();
        } catch (verifyError: any) {
            console.error('SMTP Connection Failed:', verifyError);
            return NextResponse.json({ error: `Connection failed: ${verifyError.message}` }, { status: 400 });
        }

        // 2. Save to DB on success
        const { error: dbError } = await supabase
            .from('verified_senders')
            .upsert({
                email,
                owner_id: authUser.id,
                status: 'connected',
                smtp_config: { host, port, user, pass, secure },
                verification_code: null // No code needed for SMTP
            }, { onConflict: 'email, owner_id' });

        if (dbError) throw dbError;

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Connect SMTP failed:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
