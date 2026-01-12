import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        // Authenticate user
        const authClient = await createClient();
        const { data: { user } } = await authClient.auth.getUser();

        // Use Admin client for the write to ensure no RLS blocking on creation if policies are strict,
        // but WE MUST USE THE AUTHENTICATED USER ID for ownership.
        const supabase = createAdminClient();

        const body = await req.json();
        const { id, name, description, graph, code, user_id } = body;

        // Basic validation
        if (!name || !graph || !code) {
            return NextResponse.json(
                { error: 'Missing required fields: name, graph, code' },
                { status: 400 }
            );
        }

        // Use authenticated user ID if available, otherwise fallback (development/admin mode)
        const finalUserId = user?.id || user_id || '00000000-0000-0000-0000-000000000000';

        // Hardcode product_id for 'rune' as per instructions verify slug='rune' 
        // or we can query it. For performance we might hardcode or query once.
        const { data: productData, error: productError } = await supabase
            .from('ecosystem_products')
            .select('id')
            .eq('product_key', 'rune')
            .single();

        if (productError || !productData) {
            console.warn("Could not find 'rune' product in ecosystem_products, ensure it exists.");
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
            user_id: finalUserId,
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

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    let userId = 'unknown';
    try {
        // Use authenticated client to respect RLS
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;

        console.log(`[WorkflowList] Fetching for user: ${userId}`);

        // Optional: filter by user_id if we want to add that logic later
        const { data, error } = await supabase
            .from('rune_workflows')
            .select('id, name, description, updated_at')
            .order('updated_at', { ascending: false });

        if (error) throw error;

        console.log(`[WorkflowList] Success. Found ${data?.length || 0} workflows for user ${userId}`);

        return NextResponse.json({ workflows: data });

    } catch (error: unknown) {
        console.error(`[WorkflowList] Error for user ${userId}:`, error);
        return NextResponse.json(
            { error: 'Failed to list cloud workflows' },
            { status: 500 }
        );
    }
}
