import { createClient as createAuthClient } from '@cumulus/auth/client'

/**
 * Next.js-safe wrapper for browser auth client creation.
 * Keeps NEXT_PUBLIC_* reads explicit so client builds inline values correctly.
 */
export function createClient() {
  return createAuthClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  })
}

