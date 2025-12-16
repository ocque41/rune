'use client'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Types
type User = any // Using simple type for now, can be typed strictly with DB types
type AuthContextType = {
    user: User | null
    signOut: () => Promise<void>
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    // 1. Init Client with Root Domain Cookies
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: {
                domain: '.cumulush.com',
                sameSite: 'lax',
                secure: true,
            }
        }
    )

    // 2. Broadcast Channel for Cross-Tab Sync
    useEffect(() => {
        // Only run in browser
        if (typeof window === 'undefined') return

        const channel = new BroadcastChannel('cumulush_auth')

        const handleMessage = (event: MessageEvent) => {
            if (event.data === 'auth:logout') {
                // Detected logout from another tab!
                // Force reload to clear client state and trigger middleware check
                window.location.reload()
            }
        }

        channel.addEventListener('message', handleMessage)

        return () => {
            channel.removeEventListener('message', handleMessage)
            channel.close()
        }
    }, [])

    // 3. User State Listener
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null)
            setIsLoading(false)

            if (event === 'SIGNED_OUT') {
                setUser(null)
                router.refresh()
            }
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [supabase, router])

    // 4. Global Sign Out Function
    const signOut = async () => {
        try {
            // Notify other tabs immediately
            const channel = new BroadcastChannel('cumulush_auth')
            channel.postMessage('auth:logout')
            channel.close()

            // Call our Server Route for full cleanup
            await fetch('/api/auth/signout', { method: 'POST' })

            // Also call client-side signout as backup
            await supabase.auth.signOut()

            // Hard Redirect to ensure clean state
            window.location.href = '/login'
        } catch (error) {
            console.error('Logout failed', error)
        }
    }

    return (
        <AuthContext.Provider value={{ user, signOut, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
