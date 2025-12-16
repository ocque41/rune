import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabase = await createClient()

    // Sign out on the server - this clears the HttpOnly cookie
    await supabase.auth.signOut()

    return NextResponse.redirect(new URL('/login', request.url), {
        status: 302,
    })
}
