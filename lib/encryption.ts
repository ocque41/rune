import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey() {
    const rawKey = process.env.RUNE_SECRETS_ENCRYPTION_KEY;

    if (!rawKey) {
        throw new Error('RUNE_SECRETS_ENCRYPTION_KEY is required to encrypt BYOK secrets.');
    }

    return crypto.createHash('sha256').update(String(rawKey)).digest();
}

/**
 * Encrypts a string using AES-256-GCM.
 * format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // GCM standard IV length is 12 bytes
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with encrypt().
 */
export function decrypt(text: string): string {
    try {
        const parts = text.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted format');
        }

        const [ivHex, authTagHex, encryptedHex] = parts;

        const key = getEncryptionKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch {
        throw new Error('Failed to decrypt secret');
    }
}
