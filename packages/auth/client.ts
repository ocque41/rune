import { createBrowserClient } from '@supabase/ssr'

type ClientEnv = Partial<{
  AUTH_COOKIE_DOMAIN: string
  AUTH_COOKIE_SECURE_MODE: string
  NEXT_PUBLIC_AUTH_COOKIE_DOMAIN: string
  NEXT_PUBLIC_AUTH_COOKIE_SECURE_MODE: string
  NEXT_PUBLIC_COOKIE_DOMAIN: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_SUPABASE_URL: string
  NODE_ENV: string
  VERCEL_ENV: string
}>

export type CreateBrowserSupabaseClientOptions = {
  env?: ClientEnv
  supabaseKey?: string
  supabaseUrl?: string
}

function isProdLike(env: ClientEnv = process.env): boolean {
  return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

function resolveClientCookieOptions(env: ClientEnv = process.env) {
  const configuredDomain =
    env.AUTH_COOKIE_DOMAIN ?? env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ?? env.NEXT_PUBLIC_COOKIE_DOMAIN
  const domain =
    configuredDomain && configuredDomain !== 'auto'
      ? configuredDomain
      : isProdLike(env)
        ? '.cumulush.com'
        : undefined

  const secureMode = (env.AUTH_COOKIE_SECURE_MODE ?? env.NEXT_PUBLIC_AUTH_COOKIE_SECURE_MODE ?? 'auto').toLowerCase()
  const secure =
    secureMode === 'always'
      ? true
      : secureMode === 'never'
        ? false
        : typeof window !== 'undefined'
          ? window.location.protocol === 'https:'
          : isProdLike(env)

  return {
    ...(domain ? { domain } : {}),
    sameSite: 'lax' as const,
    secure,
    path: '/' as const,
  }
}

export function createClient(options: CreateBrowserSupabaseClientOptions = {}) {
  const env = options.env ?? process.env
  const supabaseUrl = options.supabaseUrl ?? env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = options.supabaseKey ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: resolveClientCookieOptions(env),
  })
}

export const createBrowserSupabaseClient = createClient
