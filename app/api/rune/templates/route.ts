import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('rune_user_templates')
            .select('*')
            .eq('user_id', user.id)
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
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

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
                user_id: user.id
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
