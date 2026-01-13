import nodemailer from 'nodemailer';
import { Resend } from 'resend';

type EmailConfig = {
    from?: string; // Optional, can default based on provider
    to: string;
    subject: string;
    html: string;
    text?: string;
    smtpConfig?: {
        host: string;
        port: number;
        user: string;
        pass: string;
        secure?: boolean;
    };
};

export async function sendEmail(config: EmailConfig) {
    // 0. Custom User SMTP (Highest Priority - BYO-SMTP)
    if (config.smtpConfig) {
        const transporter = nodemailer.createTransport({
            host: config.smtpConfig.host,
            port: config.smtpConfig.port,
            auth: {
                user: config.smtpConfig.user,
                pass: config.smtpConfig.pass,
            },
            secure: config.smtpConfig.secure === true,
        });

        // When using custom SMTP, the 'from' header MUST match the user (generally)
        // or whatever they configured. We trust the input 'from' here, or default to the user.
        return await transporter.sendMail({
            from: config.from || config.smtpConfig.user,
            to: config.to,
            subject: config.subject,
            text: config.text || config.html.replace(/<[^>]*>?/gm, ''),
            html: config.html,
        });
    }

    // 1. SMTP Provider (System Default)
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
        // - Free tier without verified domain: MUST be 'onboarding@resend.dev'
        // - With verified domain: Can be 'anything@yourverifieddomain.com'
        // 
        // We TRUST the user's config.from if provided (they may have verified their domain).
        // Only default to onboarding@resend.dev if no FROM is specified.

        const fromAddress = config.from || 'onboarding@resend.dev';

        console.log(`[Email] Sending via Resend: from="${fromAddress}", to="${config.to}"`);

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: config.to,
            subject: config.subject,
            html: config.html,
            text: config.text || config.html.replace(/<[^>]*>?/gm, ''),
        });

        if (error) {
            console.error('[Email] Resend API Error:', error);

            // Provide more helpful error messages
            if (error.message?.includes('from') || error.message?.includes('sender') || error.message?.includes('domain')) {
                throw new Error(`Email failed: ${error.message}. Make sure your domain is verified at resend.com/domains and the FROM address uses that domain.`);
            }
            if (error.message?.includes('to') || error.message?.includes('recipient') || error.message?.includes('not allowed')) {
                throw new Error(`Email failed: ${error.message}. On Resend free tier without a verified domain, you can only send to your account email.`);
            }

            throw new Error(`Resend Error: ${error.message}`);
        }

        console.log(`[Email] Sent successfully via Resend. ID: ${data?.id}`);

        return {
            success: true,
            id: data?.id,
            from: fromAddress,
            to: config.to,
            message: 'Email sent successfully.'
        };
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
