// app/api/rune/secrets/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { listSecretKeys, createSecret, updateSecret, deleteSecret } from '@/lib/secrets-manager';
import { redactSecrets } from '@/lib/security/secrets-policy';

const SECRET_NAME_PATTERN = /^[A-Z0-9_][A-Z0-9_-]{0,127}$/i;

function validateSecretName(name: unknown): string {
  if (typeof name !== 'string' || !name.trim()) {
    throw new Error('Secret name is required.');
  }

  const normalized = name.trim();
  if (!SECRET_NAME_PATTERN.test(normalized)) {
    throw new Error('Secret name can only contain letters, numbers, underscores, and dashes.');
  }

  return normalized;
}

function validateSecretValue(value: unknown): string {
  if (typeof value !== 'string' || !value) {
    throw new Error('Secret value is required.');
  }
  return value;
}

// Helper function to get the authenticated user's ID
async function getUserId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated.');
  }
  return user.id;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);

    const secretKeys = await listSecretKeys(userId);
    return NextResponse.json({
      secretKeys,
      secrets: secretKeys.map((name) => ({ name })),
    });
  } catch (error: any) {
    console.error('GET /api/rune/secrets failed:', redactSecrets(error?.message || error));
    return NextResponse.json({ error: 'Unable to list secrets.' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const { name: rawName, value: rawValue } = await request.json();
    const name = validateSecretName(rawName);
    const value = validateSecretValue(rawValue);

    await createSecret(userId, name, value);
    return NextResponse.json({ success: true, message: 'Secret created successfully.', secret: { name } });
  } catch (error: any) {
    console.error('POST /api/rune/secrets failed:', redactSecrets(error?.message || error));
    return NextResponse.json({ error: redactSecrets(error.message || 'Failed to create secret.') }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const { name: rawName, value: rawValue } = await request.json();
    const name = validateSecretName(rawName);
    const value = validateSecretValue(rawValue);

    await updateSecret(userId, name, value);
    return NextResponse.json({ success: true, message: 'Secret updated successfully.', secret: { name } });
  } catch (error: any) {
    console.error('PUT /api/rune/secrets failed:', redactSecrets(error?.message || error));
    return NextResponse.json({ error: redactSecrets(error.message || 'Failed to update secret.') }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const { name: rawName } = await request.json();
    const name = validateSecretName(rawName);

    await deleteSecret(userId, name);
    return NextResponse.json({ success: true, message: 'Secret deleted successfully.', secret: { name } });
  } catch (error: any) {
    console.error('DELETE /api/rune/secrets failed:', redactSecrets(error?.message || error));
    return NextResponse.json({ error: redactSecrets(error.message || 'Failed to delete secret.') }, { status: 400 });
  }
}
