'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface AgentPreset {
    id: string;
    name: string;
    description?: string;
    config: any; // LLMConfig
    is_favorite?: boolean;
    user_id: string;
    updated_at: string;
}

export async function getAgentPresets() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data } = await supabase
        .from('rune_agent_presets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    return (data || []) as AgentPreset[];
}

export async function saveAgentPreset(name: string, config: any, description?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');
    if (!name) throw new Error('Preset name is required');

    // Check if updating existing by name (optional, or just always insert new?)
    // For now, let's allow duplicates or unique names? 
    // Let's just insert.

    const { data, error } = await supabase
        .from('rune_agent_presets')
        .insert({
            user_id: user.id,
            name,
            description,
            config
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath('/playground');
    return data;
}

export async function deleteAgentPreset(id: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Unauthorized');

    const { error } = await supabase
        .from('rune_agent_presets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (error) throw new Error(error.message);

    revalidatePath('/playground');
}
