import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { applySharedCookieDomain } from '@/lib/supabase/cookie-options';

export async function middleware(request: NextRequest) {
    // 1. Create Supabase client
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                        response.cookies.set(name, value, applySharedCookieDomain(options));
                    });
                },
            },
        }
    );

    // 2. Validate session
    const {
        data: { session },
    } = await supabase.auth.getSession();

    // 3. Define protected routes (exclude public assets, api, etc.)
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/_next') ||
        request.nextUrl.pathname.startsWith('/static') ||
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname === '/favicon.ico';

    if (!isPublicRoute && !session) {
        // 4. Redirect to Central Login if not authenticated
        const redirectUrl = `https://cumulush.com/login?redirectTo=${encodeURIComponent(request.nextUrl.href)}`;

        return NextResponse.redirect(redirectUrl);
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
