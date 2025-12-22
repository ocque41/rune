import nodemailer from 'nodemailer';

type EmailConfig = {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
};

export async function sendEmail(config: EmailConfig) {
    let transporter;

    // 1. Check for Production SMTP
    if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            secure: process.env.SMTP_SECURE === 'true',
        });
    } else {
        // 2. Fallback to Ethereal (Development/Test)
        // This creates a disposable account on the fly if needed, or uses one if hardcoded.
        // For simplicity/speed in dev, we often just create one per run or use a hardcoded dev account if available.
        // Here we ensure an account exists.
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
    }

    const info = await transporter.sendMail({
        from: config.from || process.env.SMTP_FROM || '"Workflow System" <noreply@example.com>',
        to: config.to,
        subject: config.subject,
        text: config.text || config.html.replace(/<[^>]*>?/gm, ''), // fallback strip tags
        html: config.html,
    });

    // If using Ethereal, log the preview URL
    if (!process.env.SMTP_HOST) {
        console.log('[Email] Preview URL: %s', nodemailer.getTestMessageUrl(info));
        return {
            id: info.messageId,
            preview: nodemailer.getTestMessageUrl(info),
            mock: true
        };
    }

    return info;
}
