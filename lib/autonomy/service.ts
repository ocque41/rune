import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEffectivePolicy } from './policy';
import { TRIAGE_SYSTEM_PROMPT, PLANNING_SYSTEM_PROMPT } from './prompts';
import { Database } from '@/lib/types/database';
import { TOOLS_DEFINITION } from '@/lib/agent-tools';
import { SupabaseClient } from '@supabase/supabase-js';
import { executeJob } from './execution';
import { logUsageEvent } from '@/lib/usage/log';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function processPendingEvents(supabase: SupabaseClient<Database>) {
    const { data: events, error } = await supabase
        .from('rune_agent_events')
        .select('id')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

    if (error) {
        console.error('[Autonomy] Failed to fetch pending events', error);
        return;
    }

    if (events && events.length > 0) {
        console.log(`[Autonomy] Processing ${events.length} pending events`);
        // Process sequentially to manage rate limits
        const eventsAny = events as any[];
        for (const e of eventsAny) {
            await processEvent(e.id, supabase);
        }
    }
}

export async function processPendingJobs(supabase: SupabaseClient<Database>) {
    const { data: jobData, error } = await supabase
        .from('rune_agent_jobs')
        .select('id')
        .in('status', ['pending', 'running'])
        .order('updated_at', { ascending: true })
        .limit(5);

    if (jobData && jobData.length > 0) {
        console.log(`[Autonomy] Processing ${jobData.length} agent jobs`);
        const jobs = jobData as any[];
        for (const job of jobs) {
            await executeJob(job.id, supabase);
        }
    }
}

export async function processEvent(eventId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || await createClient();

    // 1. Fetch Event
    const { data: eventData, error } = await supabase
        .from('rune_agent_events')
        .select('*')
        .eq('id', eventId)
        .single();

    // @ts-ignore
    const event = eventData as any;

    if (error || !event) {
        console.error(`[Autonomy] Event ${eventId} not found`); // Don't throw to avoid killing cron loop
        return;
    }

    if (event.status !== 'pending') {
        console.log(`[Autonomy] Event ${eventId} already processed (status: ${event.status})`);
        return;
    }

    // 2. Get Policy
    const { config: policy, source } = await getEffectivePolicy(supabase, event.user_id, event.workflow_id || undefined);

    // Check global kill switch
    if (policy.mode === 'OFF') {
        await updateEventStatus(supabase, eventId, 'ignored', { reason: 'Autonomy mode is OFF' });
        return;
    }

    // Trigger filters
    if (policy.triggersEnabled?.manualOnly) {
        await updateEventStatus(supabase, eventId, 'ignored', { reason: 'Manual-only mode enabled' });
        return;
    }

    if (event.source_type === 'webhook' && policy.triggersEnabled?.webhook === false) {
        await updateEventStatus(supabase, eventId, 'ignored', { reason: 'Webhook triggers disabled' });
        return;
    }

    if (event.source_type === 'schedule' && policy.triggersEnabled?.schedule === false) {
        await updateEventStatus(supabase, eventId, 'ignored', { reason: 'Schedule triggers disabled' });
        return;
    }

    if (event.source_type === 'system') {
        const systemEvent = event.payload?.event || '';
        if (systemEvent.startsWith('run.') && policy.triggersEnabled?.runCompletion === false) {
            await updateEventStatus(supabase, eventId, 'ignored', { reason: 'Run completion triggers disabled' });
            return;
        }
    }

    // 3. Triage (AI)
    try {
        const decision = await runTriageAI(event, policy);

        if (decision.decision === 'IGNORE') {
            await updateEventStatus(supabase, eventId, 'ignored', { reason: decision.reason });
            return;
        }

        if (decision.decision === 'PLAN') {
            // 4. Create Job
            // @ts-ignore
            const { data: jobData, error: jobError } = await supabase
                .from('rune_agent_jobs')
                .insert({
                    user_id: event.user_id,
                    event_id: event.id,
                    workflow_id: event.workflow_id,
                    title: decision.suggested_title || 'Untitled Job',
                    status: 'planning',
                    priority: decision.priority || 'normal',
                    context: { triage_reason: decision.reason }
                })
                .select()
                .single();

            if (jobError) throw jobError;

            // @ts-ignore
            const job = jobData as any;

            await updateEventStatus(supabase, eventId, 'processed');

            // Trigger Planning Phase
            await runPlanning(job.id, supabase);
            return job;
        }

        // Handle WAIT logic
        if (decision.decision === 'WAIT') {
            await updateEventStatus(supabase, eventId, 'pending', { reason: 'AI requested wait', decision });
        }

    } catch (err: any) {
        console.error('[Autonomy] Process failed:', err);
        await updateEventStatus(supabase, eventId, 'error', { error: err.message });
    }
}

export async function runPlanning(jobId: string, supabaseClient?: SupabaseClient<Database>) {
    const supabase = supabaseClient || await createClient();

    // 1. Fetch Job
    const { data: jobData, error } = await supabase
        .from('rune_agent_jobs')
        .select('*, rune_agent_events(*)')
        .eq('id', jobId)
        .single();

    // @ts-ignore
    const job = jobData as any;

    if (error || !job) {
        console.error('[Autonomy] Job not found for planning:', jobId);
        return;
    }

    const event = job.rune_agent_events;

    // 2. Policy
    const { config: policy } = await getEffectivePolicy(supabase, job.user_id, job.workflow_id || undefined);

    // 3. Plan (AI)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
    ${PLANNING_SYSTEM_PROMPT}

    Available Tools:
    ${JSON.stringify(TOOLS_DEFINITION.map(t => ({ name: t.function.name, description: t.function.description })), null, 2)}

    Event: ${JSON.stringify(event, null, 2)}
    Triage Context: ${JSON.stringify(job.context)}
    `;

    try {
        const result = await model.generateContent(prompt);

        // LOGGING
        logUsageEvent({
            userId: job.user_id,
            source: 'autonomy_plan',
            jobId: jobId,
            workflowId: job.workflow_id,
            model: 'gemini-1.5-flash',
            inputTokens: result.response.usageMetadata?.promptTokenCount,
            outputTokens: result.response.usageMetadata?.candidatesTokenCount,
            totalTokens: result.response.usageMetadata?.totalTokenCount,
            cachedTokens: result.response.usageMetadata?.cachedContentTokenCount,
            status: 'success'
        });

        const responseText = result.response.text();
        const plan = JSON.parse(responseText);

        // 4. Determine Initial Status based on Policy Mode
        let initialStatus = 'waiting_approval';

        if (policy.mode === 'AUTONOMOUS') {
            initialStatus = 'pending'; // Ready for execution queue
        }

        // 5. Update Job
        // @ts-ignore
        await supabase.from('rune_agent_jobs').update({
            plan: plan,
            status: initialStatus,
            updated_at: new Date().toISOString()
        }).eq('id', jobId);

        // Connect Execution Phase
        if (initialStatus === 'pending') {
            await executeJob(jobId, supabase);
        }

    } catch (e: any) {
        console.error('[Autonomy] Planning failed', e);
        // @ts-ignore
        await supabase.from('rune_agent_jobs').update({
            status: 'failed',
            result: { error: e.message }
        }).eq('id', jobId);
    }
}

async function updateEventStatus(supabase: SupabaseClient<Database>, id: string, status: string, metadata: any = {}) {
    // @ts-ignore
    await supabase.from('rune_agent_events').update({
        status,
        processing_metadata: metadata,
        processed_at: new Date().toISOString()
    }).eq('id', id);
}

async function runTriageAI(event: any, policy: any) {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });

    const prompt = `
    ${TRIAGE_SYSTEM_PROMPT}

    User Policy: ${JSON.stringify(policy, null, 2)}
    
    Incoming Event:
    ${JSON.stringify(event, null, 2)}
    `;

    const result = await model.generateContent(prompt);

    // LOGGING
    logUsageEvent({
        userId: event.user_id,
        source: 'autonomy_triage',
        metadata: { event_id: event.id },
        workflowId: event.workflow_id,
        model: 'gemini-1.5-flash',
        inputTokens: result.response.usageMetadata?.promptTokenCount,
        outputTokens: result.response.usageMetadata?.candidatesTokenCount,
        totalTokens: result.response.usageMetadata?.totalTokenCount,
        cachedTokens: result.response.usageMetadata?.cachedContentTokenCount,
        status: 'success'
    });

    const text = result.response.text();
    return JSON.parse(text);
}
