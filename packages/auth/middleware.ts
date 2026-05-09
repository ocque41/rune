import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'

type SameSite = 'lax' | 'strict' | 'none'

export type CookiePolicy = {
  domain?: string
  path: string
  sameSite: SameSite
  secure: boolean
}

export type RedirectPolicyOptions = {
  allowedLocalHosts?: string[]
  allowedRoots?: string[]
  requireHttpsInProd?: boolean
}

export type AuthContext = {
  app: string
  attempt: number
  host: string
  path: string
  reason: string
  requestId: string
}

export type ValidatedUserResult = {
  error: string | null
  user: { email?: string; id: string } | null
}

export type TelemetryEvent = {
  appKey: string
  attempt?: number | null
  decision: string
  eventType: string
  metadata?: Record<string, unknown>
  redirectAllowed?: boolean | null
  redirectTo?: string | null
  requestId: string
  sessionCookiePresent?: boolean | null
  staleSession?: boolean | null
  statusCode?: number
  userValid?: boolean | null
}

type SendTelemetryOptions = {
  endpoint?: string
  event: TelemetryEvent
  request: MiddlewareRequest | Request
  secret?: string
}

type CookieCarrier = {
  cookies: {
    getAll(): Array<unknown>
    set(...args: unknown[]): unknown
  }
}

type MiddlewareEventLike = { waitUntil: (promise: Promise<unknown>) => void }

type MiddlewareCookieStore = {
  delete(name: string): void
  getAll(): Array<{ name: string; value: string }>
  set(name: string, value: string): void
}

export type MiddlewareRequest = {
  cookies: MiddlewareCookieStore
  headers: Headers
  method: string
  nextUrl: URL
  url: string
}

export interface AuthMiddlewareResult {
  requestId: string
  response: Response
  session: { user: User } | null
  sessionCookiePresent: boolean
  staleSession: boolean
}

type AuthMiddlewareOptions = {
  appKey?: string
  event?: MiddlewareEventLike
}

type RedirectToLoginOptions = {
  appKey?: string
  attempt?: number
  centralLoginUrl?: string
  event?: MiddlewareEventLike
  reason?: string
  requestId?: string
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value || !value.trim()) return fallback
  return value
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

function stableHost(value: string): string {
  return value.trim().toLowerCase().replace(/^\./, '')
}

function parseAttempt(value: string | null): number {
  const parsed = Number.parseInt(value ?? '0', 10)
  if (Number.isNaN(parsed) || parsed < 0) return 0
  return parsed
}

function isProdLike(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

function getRequestProtocol(requestUrl?: string): 'http:' | 'https:' | null {
  if (!requestUrl) return null

  try {
    const parsed = new URL(requestUrl)
    return parsed.protocol === 'https:' ? 'https:' : 'http:'
  } catch {
    return null
  }
}

export function getAllowedRoots(env: NodeJS.ProcessEnv = process.env): string[] {
  return parseCsv(env.FEDERATED_ALLOWED_ROOTS, ['cumulush.com']).map(stableHost)
}

export function getAllowedLocalHosts(env: NodeJS.ProcessEnv = process.env): string[] {
  return parseCsv(
    env.FEDERATED_LOCAL_HOSTS,
    ['localhost', '127.0.0.1', 'local.cumulush.com']
  ).map(stableHost)
}

export function resolveCookiePolicy(
  env: NodeJS.ProcessEnv = process.env,
  requestUrl?: string
): CookiePolicy {
  const configuredDomain =
    env.AUTH_COOKIE_DOMAIN ?? env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? env.NEXT_PUBLIC_COOKIE_DOMAIN
  const secureMode = (env.AUTH_COOKIE_SECURE_MODE ?? env.NEXT_PUBLIC_AUTH_COOKIE_SECURE_MODE ?? 'auto').toLowerCase()
  const prodLike = isProdLike(env)
  const protocol = getRequestProtocol(requestUrl)

  const secure =
    secureMode === 'always'
      ? true
      : secureMode === 'never'
        ? false
        : protocol === 'https:' || prodLike

  const domain =
    configuredDomain && configuredDomain !== 'auto'
      ? configuredDomain
      : prodLike
        ? '.cumulush.com'
        : undefined

  return {
    ...(domain ? { domain } : {}),
    secure,
    sameSite: 'lax',
    path: '/',
  }
}

export function isAllowedRedirect(
  url: string,
  options: RedirectPolicyOptions = {}
): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const allowedRoots = (options.allowedRoots ?? getAllowedRoots()).map(stableHost)
    const allowedLocalHosts = (options.allowedLocalHosts ?? getAllowedLocalHosts()).map(stableHost)
    const requireHttpsInProd = options.requireHttpsInProd ?? isProdLike()
    const isLocal = allowedLocalHosts.includes(host)
    const isRootAllowed = allowedRoots.some((root) => host === root || host.endsWith(`.${root}`))
    const protocolAllowed =
      parsed.protocol === 'https:' ||
      (!requireHttpsInProd && parsed.protocol === 'http:' && isLocal)

    return protocolAllowed && (isRootAllowed || isLocal)
  } catch {
    return false
  }
}

export function buildAuthContext(context: AuthContext): AuthContext {
  return {
    ...context,
    attempt: Math.max(0, context.attempt),
  }
}

export function buildCentralLoginUrl({
  authContext,
  centralLoginUrl,
  redirectTo,
}: {
  authContext: AuthContext
  centralLoginUrl: string
  redirectTo: string
}): string {
  const target = new URL(centralLoginUrl)
  target.searchParams.set('redirectTo', redirectTo)
  target.searchParams.set('auth_src', authContext.app)
  target.searchParams.set('auth_reason', authContext.reason)
  target.searchParams.set('auth_rid', authContext.requestId)
  target.searchParams.set('auth_attempt', String(authContext.attempt))
  return target.toString()
}

export function hasSupabaseAuthCookies(request: MiddlewareRequest): boolean {
  return request.cookies.getAll().some((cookie) => cookie.name.startsWith('sb-'))
}

export function detectStaleSession({
  hasSbCookies,
  userResult,
}: {
  hasSbCookies: boolean
  userResult: ValidatedUserResult
}): boolean {
  return hasSbCookies && !userResult.user
}

export function clearSupabaseAuthCookies({
  cookiePolicy,
  request,
  response,
}: {
  cookiePolicy: CookiePolicy
  request: MiddlewareRequest
  response: CookieCarrier
}) {
  const sbCookies = request.cookies.getAll().filter((cookie) => cookie.name.startsWith('sb-'))

  for (const cookie of sbCookies) {
    request.cookies.delete(cookie.name)
    response.cookies.set(cookie.name, '', {
      ...cookiePolicy,
      expires: new Date(0),
      maxAge: 0,
    })
  }
}

export function clearSupabaseCookies(
  request: MiddlewareRequest,
  response: CookieCarrier,
  cookiePolicy: CookiePolicy
) {
  clearSupabaseAuthCookies({ request, response, cookiePolicy })
}

export function copyResponseCookies<T extends CookieCarrier>(
  source: CookieCarrier,
  target: T
): T
export function copyResponseCookies<T extends CookieCarrier>(options: {
  source: CookieCarrier
  target: T
}): T
export function copyResponseCookies<T extends CookieCarrier>(
  sourceOrOptions: CookieCarrier | { source: CookieCarrier; target: T },
  targetArg?: T
): T {
  const source =
    targetArg === undefined
      ? (sourceOrOptions as { source: CookieCarrier; target: T }).source
      : (sourceOrOptions as CookieCarrier)
  const target =
    targetArg === undefined
      ? (sourceOrOptions as { source: CookieCarrier; target: T }).target
      : targetArg

  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }

  return target
}

export function redirectWithSupabaseCookies({
  response,
  url,
}: {
  response: CookieCarrier
  url: string | URL
}) {
  return copyResponseCookies(response, NextResponse.redirect(url))
}

export function createSupabaseMiddlewareClient({
  cookiePolicy,
  request,
  response,
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!,
}: {
  cookiePolicy: CookiePolicy
  request: MiddlewareRequest
  response: CookieCarrier
  supabaseAnonKey?: string
  supabaseUrl?: string
}) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: cookiePolicy,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            ...cookiePolicy,
          })
        })
      },
    },
  })
}

export async function getValidatedUser(supabaseClient: {
  auth: {
    getUser: () => Promise<{
      data: { user: { email?: string; id: string } | null }
      error: { message?: string } | null
    }>
  }
}): Promise<ValidatedUserResult> {
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()

  return {
    user: user ? { id: user.id, email: user.email } : null,
    error: error?.message ?? null,
  }
}

function toHex(input: ArrayBuffer): string {
  return Array.from(new Uint8Array(input))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function signHmac(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return toHex(signature)
}

export async function sendAuthTelemetry(
  request: MiddlewareRequest | Request,
  event: TelemetryEvent
): Promise<void>
export async function sendAuthTelemetry(options: SendTelemetryOptions): Promise<void>
export async function sendAuthTelemetry(
  input: MiddlewareRequest | Request | SendTelemetryOptions,
  eventArg?: TelemetryEvent
): Promise<void> {
  const options =
    eventArg
      ? { request: input as MiddlewareRequest | Request, event: eventArg }
      : (input as SendTelemetryOptions)

  const endpoint =
    options.endpoint ??
    process.env.AUTH_TELEMETRY_INGEST_URL ??
    'https://cumulush.com/api/auth/telemetry'
  const secret = options.secret ?? process.env.AUTH_TELEMETRY_INGEST_SECRET

  if (!endpoint || !secret) return

  const requestUrl =
    'nextUrl' in options.request && options.request.nextUrl
      ? options.request.nextUrl
      : new URL(options.request.url)
  const forwardedFor = options.request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() ?? null
  const userAgent = options.request.headers.get('user-agent') ?? null

  const payload = {
    ...options.event,
    host: requestUrl.host,
    path: requestUrl.pathname,
    method: options.request.method,
    ip,
    userAgent,
  }

  const body = JSON.stringify(payload)
  const ts = Date.now().toString()
  const signature = await signHmac(secret, `${ts}.${body}`)

  await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-auth-telemetry-signature': signature,
      'x-auth-telemetry-ts': ts,
    },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

function queueTelemetry(
  request: MiddlewareRequest,
  event: MiddlewareEventLike | undefined,
  telemetryEvent: TelemetryEvent
) {
  if (!event) return
  event.waitUntil(sendAuthTelemetry(request, telemetryEvent))
}

export async function createAuthMiddleware(
  request: MiddlewareRequest,
  options: AuthMiddlewareOptions = {}
): Promise<AuthMiddlewareResult> {
  const appKey = options.appKey ?? 'cumulus'
  const requestId = crypto.randomUUID()
  const authAttempt = parseAttempt(request.nextUrl.searchParams.get('auth_attempt'))
  const cookiePolicy = resolveCookiePolicy(process.env, request.url)
  const sessionCookiePresent = hasSupabaseAuthCookies(request)

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

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    const staleSession = sessionCookiePresent && !user

    if (staleSession) {
      clearSupabaseAuthCookies({ request, response, cookiePolicy })
    }

    if (error) {
      queueTelemetry(request, options.event, {
        requestId,
        appKey,
        eventType: 'auth_check',
        decision: 'error',
        statusCode: 200,
        userValid: false,
        staleSession,
        sessionCookiePresent,
        attempt: authAttempt,
      })

      return {
        session: null,
        response,
        requestId,
        staleSession,
        sessionCookiePresent,
      }
    }

    queueTelemetry(request, options.event, {
      requestId,
      appKey,
      eventType: 'auth_check',
      decision: user ? 'allow_user' : 'user_missing',
      statusCode: 200,
      userValid: Boolean(user),
      staleSession,
      sessionCookiePresent,
      attempt: authAttempt,
    })

    return {
      session: user ? { user } : null,
      response,
      requestId,
      staleSession,
      sessionCookiePresent,
    }
  } catch {
    const staleSession = sessionCookiePresent

    queueTelemetry(request, options.event, {
      requestId,
      appKey,
      eventType: 'auth_check',
      decision: 'exception',
      statusCode: 200,
      userValid: false,
      staleSession,
      sessionCookiePresent,
      attempt: authAttempt,
    })

    return {
      session: null,
      response,
      requestId,
      staleSession,
      sessionCookiePresent,
    }
  }
}

export function redirectToLogin(
  request: MiddlewareRequest,
  options: RedirectToLoginOptions = {}
): Response {
  const appKey = options.appKey ?? 'cumulus'
  const requestId = options.requestId ?? crypto.randomUUID()
  const attempt =
    (options.attempt ?? parseAttempt(request.nextUrl.searchParams.get('auth_attempt'))) + 1
  const reason = options.reason ?? 'no_user'
  const redirectCandidate = request.nextUrl.href
  const redirectAllowed = isAllowedRedirect(redirectCandidate)
  const redirectTo = redirectAllowed ? redirectCandidate : request.nextUrl.origin
  const centralLoginUrl =
    options.centralLoginUrl ?? process.env.CENTRAL_LOGIN_URL ?? 'https://cumulush.com/login'
  const redirectUrl = buildCentralLoginUrl({
    centralLoginUrl,
    redirectTo,
    authContext: buildAuthContext({
      app: appKey,
      reason,
      requestId,
      path: request.nextUrl.pathname,
      host: request.nextUrl.host,
      attempt,
    }),
  })

  queueTelemetry(request, options.event, {
    requestId,
    appKey,
    eventType: 'auth_guard',
    decision: reason === 'stale_session' ? 'redirect_stale_session' : 'redirect_no_user',
    statusCode: 302,
    userValid: false,
    staleSession: reason === 'stale_session',
    sessionCookiePresent: null,
    attempt,
    redirectTo,
    redirectAllowed,
  })

  const response = NextResponse.redirect(redirectUrl)
  if (reason === 'stale_session') {
    clearSupabaseAuthCookies({
      request,
      response,
      cookiePolicy: resolveCookiePolicy(process.env, request.url),
    })
  }

  return response
}

export function unauthorizedResponse(): Response {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
