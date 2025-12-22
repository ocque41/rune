import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Generate 6-digit code
        const code = crypto.randomInt(100000, 999999).toString();

        // Save to DB (Upsert)
        // We use upsert to handle re-sending code to same email
        const { error: dbError } = await supabase
            .from('verified_senders')
            .upsert({
                email,
                owner_id: user.id,
                verification_code: code,
                status: 'pending'
            }, { onConflict: 'email, owner_id' });

        if (dbError) throw dbError;

        // Send Email
        await sendEmail({
            from: process.env.SMTP_FROM || 'noreply@cumulus.run',
            to: email,
            subject: 'Verify your Sender Identity',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Verify Sender Identity</h2>
                    <p>Use the following code to verify <strong>${email}</strong> as a sender for your workflows:</p>
                    <h1 style="background: #f4f4f4; padding: 20px; text-align: center; letter-spacing: 5px;">${code}</h1>
                    <p>If you didn't request this, please ignore this email.</p>
                </div>
            `,
            text: `Your verification code is: ${code}`
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Send verification failed:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
