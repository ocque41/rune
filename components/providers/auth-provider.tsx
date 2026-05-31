'use client'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { createClient, hasSupabaseClientConfig } from '@/lib/supabase/client'

type User = any
type AuthContextType = {
    user: User | null
    signOut: () => Promise<void>
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(() => hasSupabaseClientConfig())
    const [supabase] = useState(() => hasSupabaseClientConfig() ? createClient() : null)
    const router = useRouter()

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
        if (!supabase) {
            setUser(null)
            setIsLoading(false)
            return
        }

        let isActive = true

        const hydrateSession = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (!isActive) return

            setUser(session?.user ?? null)
            setIsLoading(false)
        }

        void hydrateSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            if (!isActive) return

            setUser(session?.user ?? null)
            setIsLoading(false)

            if (event === 'SIGNED_OUT') {
                setUser(null)
                router.refresh()
            }
        })

        return () => {
            isActive = false
            subscription.unsubscribe()
        }
    }, [supabase, router])

    // 4. Global Sign Out Function
    const signOut = async () => {
        try {
            setUser(null)

            // Notify other tabs immediately
            const channel = new BroadcastChannel('cumulush_auth')
            channel.postMessage('auth:logout')
            channel.close()

            if (supabase) {
                // Call our Server Route for full cleanup
                await fetch('/api/auth/signout', { method: 'POST' })
                await supabase.auth.signOut({ scope: 'global' })
            }
        } catch (error) {
            console.error('Logout failed', error)
        } finally {
            window.location.href = '/login'
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
