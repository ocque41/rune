import { createBrowserClient } from '@supabase/ssr'
import { resolveCookiePolicy } from './cookie-options';

export function createClient() {
    const cookiePolicy = resolveCookiePolicy(process.env)

    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: cookiePolicy,
        }
    )
}
