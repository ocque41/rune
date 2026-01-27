import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ingestAutonomyEvent } from '@/lib/autonomy/events';
import { processEvent } from '@/lib/autonomy/service';
import { z } from 'zod';
import { withTrace } from '@/lib/trace';

const TriggerSchema = z.object({
    source_type: z.enum(['webhook', 'schedule', 'system']),
    workflow_id: z.string().uuid().optional(),
    payload: z.record(z.string(), z.any()).default({}),
    dedupe_key: z.string().min(1),
});

export async function POST(req: NextRequest) {
    return withTrace('api.autonomy.trigger', async () => {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            const body = await req.json();
            const validation = TriggerSchema.safeParse(body);

            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Invalid payload', details: validation.error.format() },
                    { status: 400 }
                );
            }

            const { event, deduplicated } = await ingestAutonomyEvent(
                user.id,
                validation.data as any
            );

            if (event && event.status === 'pending') {
                try {
                    // @ts-ignore
                    await processEvent(event.id);
                } catch (e) {
                    console.error('[Autonomy] Immediate processing failed', e);
                }
            }

            return NextResponse.json({
                success: true,
                deduplicated,
                event_id: event?.id,
                status: event?.status
            });
        } catch (error: any) {
            console.error('[Autonomy] Trigger failed:', error);
            return NextResponse.json(
                { error: 'Internal Server Error', message: error.message },
                { status: 500 }
            );
        }
    });
}
