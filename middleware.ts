import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server'

import {
  buildAuthContext,
  buildCentralLoginUrl,
  clearSupabaseAuthCookies,
  createSupabaseMiddlewareClient,
  detectStaleSession,
  getValidatedUser,
  hasSupabaseAuthCookies,
  isAllowedRedirect,
  resolveCookiePolicy,
  sendAuthTelemetry,
  type TelemetryEvent,
} from '@/lib/federated-auth'

const CENTRAL_LOGIN_URL = process.env.CENTRAL_LOGIN_URL ?? 'https://cumulush.com/login'

function parseAttempt(value: string | null): number {
  const parsed = Number.parseInt(value ?? '0', 10)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return parsed
}

function queueTelemetry(
  request: NextRequest,
  event: NextFetchEvent,
  telemetryEvent: TelemetryEvent
): void {
  event.waitUntil(sendAuthTelemetry(request, telemetryEvent))
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const requestId = crypto.randomUUID()
  const authAttempt = parseAttempt(request.nextUrl.searchParams.get('auth_attempt'))
  const cookiePolicy = resolveCookiePolicy(process.env, request.url)

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createSupabaseMiddlewareClient({
    request,
    response,
    cookiePolicy,
  })

  const userResult = await getValidatedUser(supabase)
  const hasSbCookies = hasSupabaseAuthCookies(request)
  const staleSession = detectStaleSession({
    hasSbCookies,
    userResult,
  })

  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/favicon.ico'

  if (!isPublicRoute && !userResult.user) {
    const redirectCandidate = request.nextUrl.href
    const redirectAllowed = isAllowedRedirect(redirectCandidate)
    const redirectTo = redirectAllowed ? redirectCandidate : request.nextUrl.origin

    const authContext = buildAuthContext({
      app: 'rune',
      reason: staleSession ? 'stale_session' : 'no_user',
      requestId,
      path: request.nextUrl.pathname,
      host: request.nextUrl.host,
      attempt: authAttempt + 1,
    })

    const loginUrl = buildCentralLoginUrl({
      centralLoginUrl: CENTRAL_LOGIN_URL,
      redirectTo,
      authContext,
    })

    if (staleSession) {
      clearSupabaseAuthCookies({
        request,
        response,
        cookiePolicy,
      })
    }

    queueTelemetry(request, event, {
      requestId,
      appKey: 'rune',
      eventType: 'auth_guard',
      decision: staleSession ? 'redirect_stale_session' : 'redirect_no_user',
      statusCode: 302,
      userValid: false,
      staleSession,
      sessionCookiePresent: hasSbCookies,
      attempt: authContext.attempt,
      redirectTo,
      redirectAllowed,
    })

    return NextResponse.redirect(loginUrl)
  }

  if (staleSession) {
    clearSupabaseAuthCookies({
      request,
      response,
      cookiePolicy,
    })
  }

  queueTelemetry(request, event, {
    requestId,
    appKey: 'rune',
    eventType: 'auth_check',
    decision: userResult.user ? 'allow_user' : 'allow_public',
    statusCode: 200,
    userValid: Boolean(userResult.user),
    staleSession,
    sessionCookiePresent: hasSbCookies,
    attempt: authAttempt,
  })

  return response
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
}
