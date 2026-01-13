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
        // Free tier: MUST be 'onboarding@resend.dev'
        // Paid/Verified: Can be 'anything@yourverifieddomain.com'
        // 
        // For free tier, we ALWAYS use onboarding@resend.dev regardless of config.from
        // and explain this in the response. The 'to' address on free tier is also
        // restricted to the account owner's email.

        // Check if this looks like a @resend.dev address or assume we need the default
        const fromAddress = config.from?.endsWith('@resend.dev')
            ? config.from
            : 'onboarding@resend.dev';

        // If user tried a custom 'from', warn in console
        if (config.from && config.from !== fromAddress) {
            console.warn(`[Email] Resend free tier: Using "${fromAddress}" instead of "${config.from}". Verify your domain at resend.com/domains to use custom addresses.`);
        }

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
            if (error.message?.includes('from') || error.message?.includes('sender')) {
                throw new Error(`Email failed: ${error.message}. On Resend free tier, emails must be sent from "onboarding@resend.dev". To use custom addresses, verify your domain at resend.com/domains.`);
            }
            if (error.message?.includes('to') || error.message?.includes('recipient')) {
                throw new Error(`Email failed: ${error.message}. On Resend free tier, you can only send to your account email. Upgrade or verify a domain.`);
            }

            throw new Error(`Resend Error: ${error.message}`);
        }

        return {
            id: data?.id,
            from: fromAddress,
            to: config.to,
            note: fromAddress !== config.from ? `Sent from "${fromAddress}" (Resend default). Verify your domain to use custom addresses.` : undefined
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
