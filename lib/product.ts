import { SupabaseClient } from '@supabase/supabase-js';

export async function getRuneProductId(supabase: SupabaseClient) {
    const { data, error } = await supabase
        .from('ecosystem_products')
        .select('id')
        .eq('product_key', 'rune')
        .single();

    if (error) {
        return null;
    }

    return data?.id || null;
}
