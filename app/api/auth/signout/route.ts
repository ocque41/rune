import { NextResponse } from 'next/server'
import { copyResponseCookies } from '@cumulus/auth/middleware'
import { createRouteHandlerSupabaseClient } from '@cumulus/auth/server'

export async function POST(request: Request) {
    const { supabase, response } = await createRouteHandlerSupabaseClient(request)

    // Sign out on the server - this clears the HttpOnly cookie
    await supabase.auth.signOut()

    return copyResponseCookies(
        response,
        NextResponse.redirect(new URL('/login', request.url), {
            status: 302,
        })
    )
}
