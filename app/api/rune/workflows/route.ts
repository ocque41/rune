import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = createServerSupabaseClient();
        const body = await req.json();
        const { id, name, description, graph, code, user_id } = body;

        // Basic validation
        if (!name || !graph || !code) {
            return NextResponse.json(
                { error: 'Missing required fields: name, graph, code' },
                { status: 400 }
            );
        }

        // In a real generic app, we'd probably want to authenticate the user securely,
        // but per instructions we are accepting a user_id or falling back.
        // Ideally we would get the user from the session if using Supabase Auth.
        // For now we'll allow passing user_id or default to a dummy one if not testing auth.
        // But we should use the one from request if provided.

        // Hardcode product_id for 'rune' as per instructions verify slug='rune' 
        // or we can query it. For performance we might hardcode or query once.
        // Let's query it to be safe or assuming the user provided context is correct.
        // However, the instructions check: "Look up or hardcode the product_id for the rune product"
        // We'll try to find it first.

        const { data: productData, error: productError } = await supabase
            .from('products')
            .select('id')
            .eq('slug', 'rune')
            .single();

        if (productError || !productData) {
            console.warn("Could not find 'rune' product, ensure it exists in products table.");
            // Fallback or error? We'll return error for safety.
            return NextResponse.json({ error: "Product 'rune' not found" }, { status: 500 });
        }

        const product_id = productData.id;

        const workflowData = {
            name,
            description,
            graph_json: graph,
            code,
            product_id,
            // If user_id is provided use it, otherwise we might need a fallback or fail.
            // Assuming the client will send the user_id if known, or we can use a "dev" user.
            user_id: user_id || '00000000-0000-0000-0000-000000000000',
            updated_at: new Date().toISOString()
        };

        let result;
        if (id) {
            // Update existing
            const { data, error } = await supabase
                .from('rune_workflows')
                .update(workflowData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('rune_workflows')
                .insert([{ ...workflowData, created_at: new Date().toISOString() }])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return NextResponse.json({ success: true, workflow: result });

    } catch (error: unknown) {
        console.error('Save workflow error:', error);
        const message = error instanceof Error ? error.message : 'Failed to save workflow';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
