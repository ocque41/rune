import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server'

import { createAuthMiddleware, redirectToLogin } from '@cumulus/auth/middleware'

const CENTRAL_LOGIN_URL = process.env.CENTRAL_LOGIN_URL ?? 'https://cumulush.com/login'

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const isPublicRoute =
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/favicon.ico'

  if (isPublicRoute) {
    return NextResponse.next({
      request: { headers: request.headers },
    })
  }

  const { session, response, requestId, staleSession } = await createAuthMiddleware(request, {
    appKey: 'rune',
    event,
  })

  if (!session) {
    return redirectToLogin(request, {
      appKey: 'rune',
      centralLoginUrl: CENTRAL_LOGIN_URL,
      event,
      reason: staleSession ? 'stale_session' : 'no_user',
      requestId,
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

