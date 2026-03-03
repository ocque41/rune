type CookiePolicy = {
    domain?: string
    secure: boolean
    sameSite: 'lax'
    path: '/'
}

function isProdLike(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.NODE_ENV === 'production' || env.VERCEL_ENV === 'production'
}

export function getSharedCookieDomain(env: NodeJS.ProcessEnv = process.env): string | undefined {
    const configured =
        env.AUTH_COOKIE_DOMAIN ||
        env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ||
        env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN

    if (configured && configured !== 'auto') {
        return configured
    }

    return isProdLike(env) ? '.cumulush.com' : undefined
}

export function resolveCookiePolicy(
    env: NodeJS.ProcessEnv = process.env,
    requestUrl?: string
): CookiePolicy {
    const secureMode = (env.AUTH_COOKIE_SECURE_MODE ?? 'auto').toLowerCase()
    const secure =
        secureMode === 'always'
            ? true
            : secureMode === 'never'
                ? false
                : requestUrl
                    ? new URL(requestUrl).protocol === 'https:'
                    : isProdLike(env)

    const domain = getSharedCookieDomain(env)

    return {
        ...(domain ? { domain } : {}),
        secure,
        sameSite: 'lax',
        path: '/',
    }
}

export function applySharedCookiePolicy<T extends Record<string, unknown>>(
    options: T,
    env: NodeJS.ProcessEnv = process.env,
    requestUrl?: string
): T & CookiePolicy {
    return {
        ...options,
        ...resolveCookiePolicy(env, requestUrl),
    }
}
