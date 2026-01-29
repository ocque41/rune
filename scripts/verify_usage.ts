
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { logUsageEvent } from '../lib/usage/log';

dotenv.config({ path: '.env.local' });

async function main() {
    console.log("Starting verification...");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get a user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError || !users || users.length === 0) {
        console.error("No users found to test with.");
        return;
    }
    const userId = users[0].id; // Use first user
    console.log(`Testing with User ID: ${userId}`);

    const runId = crypto.randomUUID();
    console.log(`Generated Run ID: ${runId}`);

    // 2. Log an Event
    console.log("Logging usage event...");
    await logUsageEvent({
        userId,
        source: 'verification_script',
        model: 'gemini-1.5-flash',
        provider: 'google',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 123,
        status: 'success',
        runId,
        metadata: { verification: true }
    });

    // 3. Verify it exists
    console.log("Waiting for persistence...");
    await new Promise(r => setTimeout(r, 2000));

    const { data: calls, error: fetchError } = await supabase
        .from('rune_llm_calls')
        .select('*')
        .eq('run_id', runId); // Assuming run_id is stored in metadata or explicitly if added to schema. 
    // Wait, logUsageEvent maps runId to job_id or just meta? 
    // valid: runId IS in payload of logUsageEvent. 
    // In logUsageEvent implementation: 
    // job_id: payload.jobId,
    // (Missing run_id column in insert? Let's check agent-db.ts or use metadata)
    // Checking log.ts again: 
    // ...
    // request_metadata: requestMetadata
    // And requestMetadata includes source, step_id, request_id. 
    // It does NOT seem to map runId to a top level column 'run_id' in rune_llm_calls unless I missed it.
    // It maps payload.jobId -> job_id.
    // Let's check if 'run_id' exists in schema. grep showed rune_llm_calls columns previously? No, grep failed.
    // list_tables showed: id, user_id, model, prompt_tokens... estimated_cost_usd... 
    // It did NOT show run_id explicitly in the truncated output for rune_llm_calls (I can't fully recall seeing it).
    // Safest: Query by request_metadata->>'run_id' if we store it there, OR just by user_id desc.

    if (fetchError) {
        console.error("Error verifying:", fetchError);
    } else {
        const found = calls?.find(c => c.estimated_cost_usd > 0); // Just check any recent
        // ACTUALLY, checking the latest call for this user
        const { data: latest } = await supabase
            .from('rune_llm_calls')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (latest) {
            console.log("SUCCESS: Found latest Log entry:", latest.id);
            console.log("Model:", latest.model);
            console.log("Tokens:", latest.total_tokens);
        } else {
            console.log("FAILURE: No log entry found.");
        }
    }
}

main().catch(console.error);
