import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

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
                        response.cookies.set(name, value, {
                            ...options,
                            domain: '.cumulush.com', // FORCE SHARED DOMAIN
                        });
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
        const loginUrl = new URL('/login', 'https://cumulush.com'); // Simplified to dev/prod assumption, user said 'cumulus.cumulush.com' or 'cumulush.com', let's stick to user request: cumulus.cumulush.com
        // Wait, user request said "e.g., at cumulus.cumulush.com". And in Detailed changes: "Redirect to cumulus.cumulush.com/login".
        // But in detailed changes code block: `const loginUrl = new URL('/login', 'https://cumulush.com');`
        // I will use `https://cumulush.com` as per the code snippet in the user request, but I should probably double check.
        // Actually, the Plan says `https://cumulus.cumulush.com/login`.
        // Let's use `https://cumulus.cumulush.com` as it's more specific to the dashboard app.
        loginUrl.hostname = 'cumulus.cumulush.com';

        // Pass current URL as redirectTo param
        loginUrl.searchParams.set('redirectTo', request.url);

        return NextResponse.redirect(loginUrl);
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
