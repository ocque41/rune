import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

type SameSite = 'lax' | 'strict' | 'none'

export type CookiePolicy = {
  domain?: string
  secure: boolean
  sameSite: SameSite
  path: string
}

export type AuthContext = {
  app: string
  reason: string
  requestId: string
  path: string
  host: string
  attempt: number
}

export type ValidatedUserResult = {
  user: { id: string; email?: string } | null
  error: string | null
}

export type TelemetryEvent = {
  requestId: string
  appKey: string
  eventType: string
  decision: string
  statusCode?: number
  userValid?: boolean | null
  staleSession?: boolean | null
  sessionCookiePresent?: boolean | null
  attempt?: number | null
  redirectTo?: string | null
  redirectAllowed?: boolean | null
  metadata?: Record<string, unknown>
}

function parseCsv(value: string | undefined, fallback: string[]): string[] {
  if (!value || !value.trim()) return fallback
  return value.split(',').map((part) => part.trim().toLowerCase()).filter(Boolean)
}

function stableHost(value: string): string {
  return value.trim().toLowerCase().replace(/^\./, '')
}

function isProdLike(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

export function resolveCookiePolicy(
  env: NodeJS.ProcessEnv = process.env,
  requestUrl?: string
): CookiePolicy {
  const prodLike = isProdLike(env)
  const configuredDomain = env.AUTH_COOKIE_DOMAIN ?? env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN
  const secureMode = (env.AUTH_COOKIE_SECURE_MODE ?? 'auto').toLowerCase()
  const protocol = requestUrl ? new URL(requestUrl).protocol : null
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

export function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    const roots = parseCsv(process.env.FEDERATED_ALLOWED_ROOTS, ['cumulush.com']).map(stableHost)
    const locals = parseCsv(
      process.env.FEDERATED_LOCAL_HOSTS,
      ['localhost', '127.0.0.1', 'local.cumulush.com']
    ).map(stableHost)
    const isLocal = locals.includes(host)
    const rootMatch = roots.some((root) => host === root || host.endsWith(`.${root}`))
    const protocolAllowed = parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isLocal)
    return protocolAllowed && (rootMatch || isLocal)
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
  centralLoginUrl,
  redirectTo,
  authContext,
}: {
  centralLoginUrl: string
  redirectTo: string
  authContext: AuthContext
}): string {
  const target = new URL(centralLoginUrl)
  target.searchParams.set('redirectTo', redirectTo)
  target.searchParams.set('auth_src', authContext.app)
  target.searchParams.set('auth_reason', authContext.reason)
  target.searchParams.set('auth_rid', authContext.requestId)
  target.searchParams.set('auth_attempt', String(authContext.attempt))
  return target.toString()
}

export function hasSupabaseAuthCookies(request: NextRequest): boolean {
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

export async function sendAuthTelemetry(request: NextRequest, event: TelemetryEvent): Promise<void> {
  const endpoint = process.env.AUTH_TELEMETRY_INGEST_URL ?? 'https://cumulush.com/api/auth/telemetry'
  const secret = process.env.AUTH_TELEMETRY_INGEST_SECRET
  if (!endpoint || !secret) return

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  const payload = {
    ...event,
    host: request.nextUrl.host,
    path: request.nextUrl.pathname,
    method: request.method,
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
      'x-auth-telemetry-ts': ts,
      'x-auth-telemetry-signature': signature,
    },
    body,
    keepalive: true,
  }).catch(() => undefined)
}

export function createSupabaseMiddlewareClient({
  request,
  response,
  cookiePolicy,
}: {
  request: NextRequest
  response: NextResponse
  cookiePolicy: CookiePolicy
}) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookiePolicy,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
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
    }
  )
}

export async function getValidatedUser(supabaseClient: {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string; email?: string } | null }
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

export function clearSupabaseAuthCookies({
  request,
  response,
  cookiePolicy,
}: {
  request: NextRequest
  response: NextResponse
  cookiePolicy: CookiePolicy
}) {
  const allCookies = request.cookies.getAll()
  const sbCookies = allCookies.filter((cookie) => cookie.name.startsWith('sb-'))
  for (const cookie of sbCookies) {
    request.cookies.delete(cookie.name)
    response.cookies.set(cookie.name, '', {
      ...cookiePolicy,
      maxAge: 0,
      expires: new Date(0),
    })
  }
}
