import nodemailer from 'nodemailer';
import { Resend } from 'resend';

type EmailConfig = {
    from?: string; // Optional, can default based on provider
    to: string;
    subject: string;
    html: string;
    text?: string;
};

export async function sendEmail(config: EmailConfig) {
    // 1. SMTP Provider (Highest Priority)
    if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            secure: process.env.SMTP_SECURE === 'true',
        });

        return await transporter.sendMail({
            from: config.from || process.env.SMTP_FROM || '"Workflow System" <noreply@example.com>',
            to: config.to,
            subject: config.subject,
            text: config.text || config.html.replace(/<[^>]*>?/gm, ''),
            html: config.html,
        });
    }

    // 2. Resend API
    if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Resend "From" requirements:
        // Free tier: MUST be 'onboarding@resend.dev'
        // Paid/Verified: Can be 'anything@yourverifieddomain.com'
        // We default to onboarding if no specific 'from' is provided, OR if the provided 'from' is likely invalid for free tier
        // Ideally, we respect the config.from if provided, but warn user if it fails.
        // For 'system' emails (verification codes), let's default to onboarding if not strictly set.

        const fromAddress = config.from || 'onboarding@resend.dev';

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: config.to,
            subject: config.subject,
            html: config.html,
            text: config.text || config.html.replace(/<[^>]*>?/gm, ''),
        });

        if (error) {
            console.error('[Email] Resend API Error:', error);
            throw new Error(`Resend Error: ${error.message}`);
        }

        return data; // Returns { id: string }
    }

    // 3. Fallback to Ethereal (Development/Test)
    const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    const info = await transporter.sendMail({
        from: config.from || '"Workflow Local" <onboarding@ethereal.email>',
        to: config.to,
        subject: config.subject,
        text: config.text || config.html.replace(/<[^>]*>?/gm, ''),
        html: config.html,
    });

    // If using Ethereal, log the preview URL
    console.log('[Email] Preview URL: %s', nodemailer.getTestMessageUrl(info));
    return {
        id: info.messageId,
        preview: nodemailer.getTestMessageUrl(info),
        mock: true
    };
}
