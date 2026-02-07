/**
 * Secrets Manager
 * Supports multiple secret providers:
 * - Environment variables (default, for development)
 * - AWS Secrets Manager (optional, for production)
 * - HashiCorp Vault (optional, for production)
 * - Supabase (optional, for database-backed secrets)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server'; // Import Supabase server client factory
import { createSupabaseSecret, getSupabaseSecret as getSupabaseSecretInternal, updateSupabaseSecret, deleteSupabaseSecret, listSupabaseSecretKeys as listSupabaseSecretKeysInternal } from './supabase-secrets'; // Import Supabase secrets functions

export type SecretsProvider = 'env' | 'aws' | 'vault' | 'supabase';

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
export async function listSecretKeys(userId: string): Promise<string[]> {
    const config = getConfig();
    const supabase = createClient(); // Create Supabase client once per request

    switch (config.provider) {
        case 'env':
            return listEnvSecretKeys();

        case 'aws':
            return listAwsSecretKeys(config);

        case 'vault':
            return listVaultSecretKeys(config);

        case 'supabase':
            return listSupabaseSecretKeysInternal(supabase, userId);

        default:
            return listEnvSecretKeys();
    }
}

/**
 * Get a secret value by key
 * This should only be called server-side, never expose to client
 */
export async function getSecret(key: string, userId?: string): Promise<string | null> {
    const config = getConfig();
    const supabase = createClient(); // Create Supabase client

    switch (config.provider) {
        case 'env':
            return getEnvSecret(key);

        case 'aws':
            return getAwsSecret(key, config);

        case 'vault':
            return getVaultSecret(key, config);

        case 'supabase':
            if (!userId) {
                console.error("userId is required for Supabase secrets provider");
                return null;
            }
            return getSupabaseSecretInternal(supabase, userId, key);

        default:
            return getEnvSecret(key);
    }
}

/**
 * Create a new secret.
 */
export async function createSecret(userId: string, name: string, value: string): Promise<void> {
    const config = getConfig();
    const supabase = createClient();

    switch (config.provider) {
        case 'supabase':
            return createSupabaseSecret(supabase, userId, name, value);
        // Add cases for other providers if they support direct creation
        default:
            throw new Error(`Secret creation not supported for provider: ${config.provider}`);
    }
}

/**
 * Update an existing secret.
 */
export async function updateSecret(userId: string, name: string, value: string): Promise<void> {
    const config = getConfig();
    const supabase = createClient();

    switch (config.provider) {
        case 'supabase':
            return updateSupabaseSecret(supabase, userId, name, value);
        // Add cases for other providers if they support direct updating
        default:
            throw new Error(`Secret updating not supported for provider: ${config.provider}`);
    }
}

/**
 * Delete a secret.
 */
export async function deleteSecret(userId: string, name: string): Promise<void> {
    const config = getConfig();
    const supabase = createClient();

    switch (config.provider) {
        case 'supabase':
            return deleteSupabaseSecret(supabase, userId, name);
        // Add cases for other providers if they support direct deletion
        default:
            throw new Error(`Secret deletion not supported for provider: ${config.provider}`);
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
