import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = createAdminClient();
        // In a real app we'd filter by authenticated user
        const { data, error } = await supabase
            .from('rune_user_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ templates: data });
    } catch (error) {
        console.error('List templates error:', error);
        return NextResponse.json({ error: 'Failed to list templates' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = createAdminClient();
        const body = await req.json();
        const { name, description, graph_json } = body;

        if (!name || !graph_json) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from('rune_user_templates')
            .insert([{
                name,
                description,
                graph_json,
                user_id: '00000000-0000-0000-0000-000000000000' // Dummy user
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ template: data });
    } catch (error) {
        console.error('Create template error:', error);
        return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
    }
}
