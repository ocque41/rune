import { getSecret as getManagedSecret } from '@/lib/secrets-manager';

const secretsCache = new Map<string, string>();

/**
 * Server-only runtime secret lookup.
 * Values are never fetched through a client-readable API route.
 */
export async function getSecret(key: string, userId: string): Promise<string> {
    if (!userId) {
        throw new Error('userId is required for runtime secret lookup');
    }

    const cacheKey = `${userId}:${key}`;
    if (secretsCache.has(cacheKey)) {
        return secretsCache.get(cacheKey)!;
    }

    const value = await getManagedSecret(key, userId);
    if (!value) throw new Error(`Secret '${key}' not found`);

    secretsCache.set(cacheKey, value);
    return value;
}

/**
 * Clear the secrets cache
 * Useful for testing or security purposes
 */
export function clearSecretsCache(): void {
    secretsCache.clear();
}

/**
 * Preload multiple secrets at once
 * Useful for optimizing workflows that need many secrets
 */
export async function preloadSecrets(keys: string[]): Promise<void> {
    throw new Error('preloadSecrets requires a user-scoped runtime and is disabled by default');
}
