export function getSharedCookieDomain(): string | undefined {
    const configured =
        process.env.AUTH_COOKIE_DOMAIN ||
        process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN ||
        process.env.NEXT_PUBLIC_SUPABASE_COOKIE_DOMAIN;

    if (!configured || configured === 'auto') {
        return undefined;
    }

    return configured;
}

export function applySharedCookieDomain<T extends { domain?: string }>(options: T): T {
    const domain = getSharedCookieDomain();
    if (!domain) {
        return options;
    }

    return {
        ...options,
        domain
    };
}
