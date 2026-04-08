// app/api/rune/secrets/route.ts
import { NextResponse } from 'next/server';
import { createServerSupabaseClient as createClient } from '@cumulus/auth/server';
import { listSecretKeys, createSecret, updateSecret, deleteSecret } from '@/lib/secrets-manager';

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
    return NextResponse.json({ secretKeys });
  } catch (error: any) {
    console.error('GET /api/rune/secrets failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const { name, value } = await request.json();

    if (!name || !value) {
      return NextResponse.json({ error: 'Secret name and value are required.' }, { status: 400 });
    }

    await createSecret(userId, name, value);
    return NextResponse.json({ message: 'Secret created successfully.' });
  } catch (error: any) {
    console.error('POST /api/rune/secrets failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const { name, value } = await request.json();

    if (!name || !value) {
      return NextResponse.json({ error: 'Secret name and value are required.' }, { status: 400 });
    }

    await updateSecret(userId, name, value);
    return NextResponse.json({ message: 'Secret updated successfully.' });
  } catch (error: any) {
    console.error('PUT /api/rune/secrets failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const userId = await getUserId(supabase);
    const { name } = await request.json(); // Assuming name is sent in body for DELETE

    if (!name) {
      return NextResponse.json({ error: 'Secret name is required.' }, { status: 400 });
    }

    await deleteSecret(userId, name);
    return NextResponse.json({ message: 'Secret deleted successfully.' });
  } catch (error: any) {
    console.error('DELETE /api/rune/secrets failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
