/**
 * Secrets Manager
 * Supports multiple secret providers:
 * - Environment variables (default, for development)
 * - AWS Secrets Manager (optional, for production)
 * - HashiCorp Vault (optional, for production)
 */

export type SecretsProvider = 'env' | 'aws' | 'vault';

export interface SecretsConfig {
    provider: SecretsProvider;
    // For AWS Secrets Manager
    awsRegion?: string;
    // For HashiCorp Vault
    vaultAddress?: string;
    vaultToken?: string;
}

/**
 * Get secrets configuration from environment variables
 */
function getConfig(): SecretsConfig {
    const provider = (process.env.SECRETS_PROVIDER || 'env') as SecretsProvider;

    return {
        provider,
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        vaultAddress: process.env.VAULT_ADDR,
        vaultToken: process.env.VAULT_TOKEN,
    };
}

/**
 * List all available secret keys (not values)
 * Returns only the keys to display in UI
 */
export async function listSecretKeys(): Promise<string[]> {
    const config = getConfig();

    switch (config.provider) {
        case 'env':
            return listEnvSecretKeys();

        case 'aws':
            return listAwsSecretKeys(config);

        case 'vault':
            return listVaultSecretKeys(config);

        default:
            return listEnvSecretKeys();
    }
}

/**
 * Get a secret value by key
 * This should only be called server-side, never expose to client
 */
export async function getSecret(key: string): Promise<string | null> {
    const config = getConfig();

    switch (config.provider) {
        case 'env':
            return getEnvSecret(key);

        case 'aws':
            return getAwsSecret(key, config);

        case 'vault':
            return getVaultSecret(key, config);

        default:
            return getEnvSecret(key);
    }
}

// ===== Environment Variables Provider =====

/**
 * List secret keys from environment variables
 * Looks for variables prefixed with WORKFLOW_SECRET_
 */
function listEnvSecretKeys(): string[] {
    const prefix = 'WORKFLOW_SECRET_';

    return Object.keys(process.env)
        .filter(key => key.startsWith(prefix))
        .map(key => key.substring(prefix.length));
}

/**
 * Get secret from environment variable
 */
function getEnvSecret(key: string): string | null {
    const envKey = `WORKFLOW_SECRET_${key}`;
    return process.env[envKey] || null;
}

// ===== AWS Secrets Manager Provider =====

/**
 * List secret keys from AWS Secrets Manager
 * Note: Requires @aws-sdk/client-secrets-manager to be installed
 */
async function listAwsSecretKeys(config: SecretsConfig): Promise<string[]> {
    try {
        // Dynamic import to avoid errors if AWS SDK is not installed
        // @ts-expect-error - Optional dependency, may not be installed
        const { SecretsManagerClient, ListSecretsCommand } = await import('@aws-sdk/client-secrets-manager');

        const client = new SecretsManagerClient({ region: config.awsRegion });
        const command = new ListSecretsCommand({});
        const response = await client.send(command);

        return (response.SecretList || [])
            .map((secret: any) => secret.Name)
            .filter(Boolean) as string[];
    } catch (error) {
        console.error('Error listing AWS secrets:', error);
        console.warn('Falling back to environment variables');
        return listEnvSecretKeys();
    }
}

/**
 * Get secret from AWS Secrets Manager
 */
async function getAwsSecret(key: string, config: SecretsConfig): Promise<string | null> {
    try {
        // @ts-expect-error - Optional dependency, may not be installed
        const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');

        const client = new SecretsManagerClient({ region: config.awsRegion });
        const command = new GetSecretValueCommand({ SecretId: key });
        const response = await client.send(command);

        return response.SecretString || null;
    } catch (error) {
        console.error(`Error getting AWS secret ${key}:`, error);
        return null;
    }
}

// ===== HashiCorp Vault Provider =====

/**
 * List secret keys from Vault
 * Note: This is a simplified implementation
 */
async function listVaultSecretKeys(config: SecretsConfig): Promise<string[]> {
    if (!config.vaultAddress || !config.vaultToken) {
        console.warn('Vault configuration missing, falling back to environment variables');
        return listEnvSecretKeys();
    }

    try {
        const response = await fetch(`${config.vaultAddress}/v1/secret/metadata/workflow?list=true`, {
            headers: {
                'X-Vault-Token': config.vaultToken,
            },
        });

        if (!response.ok) {
            throw new Error(`Vault API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data?.keys || [];
    } catch (error) {
        console.error('Error listing Vault secrets:', error);
        console.warn('Falling back to environment variables');
        return listEnvSecretKeys();
    }
}

/**
 * Get secret from Vault
 */
async function getVaultSecret(key: string, config: SecretsConfig): Promise<string | null> {
    if (!config.vaultAddress || !config.vaultToken) {
        return null;
    }

    try {
        const response = await fetch(`${config.vaultAddress}/v1/secret/data/workflow/${key}`, {
            headers: {
                'X-Vault-Token': config.vaultToken,
            },
        });

        if (!response.ok) {
            throw new Error(`Vault API error: ${response.status}`);
        }

        const data = await response.json();
        return data.data?.data?.value || null;
    } catch (error) {
        console.error(`Error getting Vault secret ${key}:`, error);
        return null;
    }
}
