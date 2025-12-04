/**
 * Runtime Secrets Helper
 * This is the getSecret() function that workflows call at runtime
 * It fetches secrets from the server-side API
 */

// Cache secrets during workflow execution to avoid repeated API calls
const secretsCache = new Map<string, string>();

/**
 * Get a secret value by key
 * This function is meant to be imported by generated workflow code
 * 
 * Usage in workflows:
 * const apiKey = await getSecret("API_KEY");
 */
export async function getSecret(key: string): Promise<string> {
    // Check cache first
    if (secretsCache.has(key)) {
        return secretsCache.get(key)!;
    }

    try {
        // Fetch from API
        const response = await fetch(`/api/secrets/${encodeURIComponent(key)}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Secret '${key}' not found`);
            }
            throw new Error(`Failed to fetch secret '${key}': ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || `Failed to retrieve secret '${key}'`);
        }

        // Cache the value
        secretsCache.set(key, data.value);

        return data.value;
    } catch (error) {
        console.error(`Error fetching secret '${key}':`, error);
        throw error;
    }
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
    await Promise.all(keys.map(key => getSecret(key)));
}
