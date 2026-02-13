// lib/supabase-secrets.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/encryption';

// Define the structure of a secret in the database
interface DbSecret {
    id: string;
    user_id: string;
    name: string;
    value: string; // Stored encrypted
    created_at: string;
    updated_at: string;
}

/**
 * Creates a new secret for a user in Supabase.
 * @param supabase The Supabase client.
 * @param userId The ID of the user creating the secret.
 * @param name The name of the secret.
 * @param value The value of the secret.
 */
export async function createSupabaseSecret(
    supabase: SupabaseClient,
    userId: string,
    name: string,
    value: string
): Promise<void> {
    const encryptedValue = encrypt(value);

    const { error } = await supabase
        .from('user_secrets')
        .insert({ user_id: userId, name, value: encryptedValue });

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            throw new Error(`Secret with name '${name}' already exists.`);
        }
        throw new Error(`Failed to create secret: ${error.message}`);
    }
}

/**
 * Retrieves a secret's value by name for a specific user from Supabase.
 * @param supabase The Supabase client.
 * @param userId The ID of the user.
 * @param name The name of the secret to retrieve.
 * @returns The secret value or null if not found.
 */
export async function getSupabaseSecret(
    supabase: SupabaseClient,
    userId: string,
    name: string
): Promise<string | null> {
    const { data, error } = await supabase
        .from('user_secrets')
        .select('value')
        .eq('user_id', userId)
        .eq('name', name)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // "no rows found"
        throw new Error(`Failed to retrieve secret: ${error.message}`);
    }

    if (!data) return null;

    return decrypt(data.value);
}

/**
 * Updates an existing secret's value by name for a specific user in Supabase.
 * @param supabase The Supabase client.
 * @param userId The ID of the user.
 * @param name The name of the secret to update.
 * @param newValue The new value for the secret.
 */
export async function updateSupabaseSecret(
    supabase: SupabaseClient,
    userId: string,
    name: string,
    newValue: string
): Promise<void> {
    const encryptedValue = encrypt(newValue);

    const { error } = await supabase
        .from('user_secrets')
        .update({ value: encryptedValue, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('name', name);

    if (error) {
        throw new Error(`Failed to update secret: ${error.message}`);
    }
}

/**
 * Deletes a secret by name for a specific user from Supabase.
 * @param supabase The Supabase client.
 * @param userId The ID of the user.
 * @param name The name of the secret to delete.
 */
export async function deleteSupabaseSecret(
    supabase: SupabaseClient,
    userId: string,
    name: string
): Promise<void> {
    const { error } = await supabase
        .from('user_secrets')
        .delete()
        .eq('user_id', userId)
        .eq('name', name);

    if (error) {
        throw new Error(`Failed to delete secret: ${error.message}`);
    }
}

/**
 * Lists all secret names for a specific user from Supabase.
 * @param supabase The Supabase client.
 * @param userId The ID of the user.
 * @returns An array of secret names.
 */
export async function listSupabaseSecretKeys(
    supabase: SupabaseClient,
    userId: string
): Promise<string[]> {
    const { data, error } = await supabase
        .from('user_secrets')
        .select('name')
        .eq('user_id', userId);

    if (error) {
        throw new Error(`Failed to list secret keys: ${error.message}`);
    }

    return data ? data.map(secret => secret.name) : [];
}