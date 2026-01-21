'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type AgentPreset = {
    id: string
    name: string
    description?: string
    config: any
    is_favorite: boolean
    updated_at: string
}

export async function getAgentPresets() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('rune_agent_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('is_favorite', { ascending: false })
        .order('updated_at', { ascending: false })

    return (data || []) as AgentPreset[]
}

export async function saveAgentPreset(data: {
    name: string
    config: any
    description?: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    if (!data.name) throw new Error('Name is required')

    const { data: preset, error } = await supabase
        .from('rune_agent_presets')
        .insert({
            user_id: user.id,
            name: data.name,
            config: data.config,
            description: data.description
        })
        .select()
        .single()

    if (error) {
        console.error('Failed to save preset', error)
        throw new Error('Failed to save preset')
    }

    // Only revalidate specific paths to avoid full page revalidation overhead
    revalidatePath('/playground')
    return preset
}

export async function deleteAgentPreset(id: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('rune_agent_presets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw error
    revalidatePath('/playground')
}

export async function togglePresetFavorite(id: string, isFavorite: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('rune_agent_presets')
        .update({ is_favorite: !isFavorite })
        .eq('id', id)
        .eq('user_id', user.id)

    if (error) throw error
    revalidatePath('/playground')
}
