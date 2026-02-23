import { createBrowserClient } from '@supabase/ssr'
import { getSharedCookieDomain } from './cookie-options';

export function createClient() {
    const domain = getSharedCookieDomain();

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        domain
            ? {
                cookieOptions: { domain },
            }
            : undefined
    )
}
