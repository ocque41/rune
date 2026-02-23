import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { ingestAutonomyEvent } from '@/lib/autonomy/events';
import { processEvent } from '@/lib/autonomy/service';
import { z } from 'zod';
import { withTrace } from '@/lib/trace';
import { verifySignature } from '@/lib/autonomy/security';

const TriggerSchema = z.object({
    source_type: z.enum(['webhook', 'schedule', 'system']),
    workflow_id: z.string().uuid().optional(),
    payload: z.record(z.string(), z.any()).default({}),
    dedupe_key: z.string().min(1),
});

export async function POST(req: NextRequest) {
    return withTrace('api.autonomy.trigger', async () => {
        const supabase = await createClient();
        const signature = req.headers.get('X-Rune-Signature');

        let userId: string | null = null;
        let workflowId: string | undefined = undefined;

        // AUTH STRATEGY 1: Bearer Token (Authenticated User)
        // Only try this if no signature is present, or as fallback?
        // Actually, if signature is present, we prioritize that flow. 

        if (!signature) {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                return NextResponse.json({ error: 'Unauthorized: Missing Token or Signature' }, { status: 401 });
            }
            userId = user.id;
        }

        try {
            // Must clone request body for signature verification (needs raw)
            // But Next.js req.json() consumes it.
            // We read text first.
            const rawBody = await req.text();
            let body: any;
            try {
                body = JSON.parse(rawBody);
            } catch (e) {
                return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
            }

            const validation = TriggerSchema.safeParse(body);

            if (!validation.success) {
                return NextResponse.json(
                    { error: 'Invalid payload', details: validation.error.format() },
                    { status: 400 }
                );
            }

            // AUTH STRATEGY 2: HMAC Signature (External Webhook)
            if (signature) {
                workflowId = validation.data.workflow_id;
                if (!workflowId) {
                    return NextResponse.json({ error: 'workflow_id required for signed webhooks' }, { status: 400 });
                }

                const adminClient = createAdminClient();
                const { data: workflow, error: workflowError } = await adminClient
                    .from('rune_workflows')
                    .select('id, user_id, webhook_secret')
                    .eq('id', workflowId)
                    .single();

                if (workflowError || !workflow) {
                    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
                }

                let signatureValid = false;
                if (workflow.webhook_secret) {
                    signatureValid = verifySignature(rawBody, workflow.webhook_secret, signature);
                }

                // Backward compatibility: older endpoint records may still carry a raw secret in secret_hash.
                // If the workflow-level secret does not validate, attempt endpoint-level validation.
                let matchedEndpointUserId: string | null = null;
                if (!signatureValid) {
                const { data: endpoints, error } = await adminClient
                    .from('rune_webhook_endpoints')
                    .select('id, user_id, secret_hash, workflow_id')
                    .eq('workflow_id', workflowId)
                    .eq('is_active', true);

                    if (error) {
                        return NextResponse.json({ error: 'Failed to validate signature' }, { status: 500 });
                    }

                    if (endpoints && endpoints.length > 0) {
                        for (const ep of endpoints) {
                            if (verifySignature(rawBody, ep.secret_hash, signature)) {
                                signatureValid = true;
                                matchedEndpointUserId = ep.user_id;
                                break;
                            }
                        }
                    }
                }

                if (!signatureValid) {
                    return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
                }

                userId = matchedEndpointUserId || workflow.user_id;
            }

            if (!userId) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const ingestionClient = signature ? createAdminClient() : supabase;
            const { event, deduplicated } = await ingestAutonomyEvent(
                userId,
                validation.data as any,
                ingestionClient as any
            );

            if (event && event.status === 'pending') {
                try {
                    // Use Admin client for background processing if trigger was signed (no user session)
                    const processingClient = (signature ? createAdminClient() : supabase) as any;
                    await processEvent(event.id, processingClient);
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
