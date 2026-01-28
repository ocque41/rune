import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserPlan } from '@/lib/billing/plan';
import { withTrace } from '@/lib/trace';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    return withTrace('api.inspect.plan', async () => {
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const planDetails = await getUserPlan(user.id);
            return NextResponse.json(planDetails);
        } catch (error: unknown) {
            console.error('Inspect Plan Error:', error);
            return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 });
        }
    });
}
