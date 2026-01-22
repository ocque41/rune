import { SupabaseClient } from '@supabase/supabase-js';

export interface RunLog {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
}

export interface StepExecution {
    stepId: string;
    stepLabel: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
    startTime?: string;
    endTime?: string;
    durationMs?: number;
    result?: any;
    error?: string;
}

export interface WaitingFor {
    type: 'event' | 'approval';
    identifier: string;
    since: string;
}

export interface WorkflowRun {
    id: string;
    workflowId?: string;
    workflowVersionId?: string;
    workflowName: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting';
    startTime: string;
    endTime?: string;
    duration?: number;
    args: any[];
    result?: any;
    error?: string;
    logs: RunLog[];
    steps?: StepExecution[];
    waitingFor?: WaitingFor;
}

/**
 * Save a new run or update an existing one
 */
export async function saveRun(supabase: SupabaseClient, run: WorkflowRun, userId: string): Promise<void> {
    const runData = {
        id: run.id,
        user_id: userId,
        workflow_id: run.workflowId || null,
        workflow_version_id: run.workflowVersionId || null,
        workflow_name: run.workflowName,
        status: run.status,
        start_time: run.startTime,
        end_time: run.endTime,
        duration: run.duration,
        args: run.args,
        result: run.result,
        error: run.error,
        logs: run.logs,
        steps: run.steps,
        waiting_for: run.waitingFor,
    };

    const { error } = await supabase
        .from('rune_workflow_runs')
        .upsert(runData);

    if (error) {
        console.error('Error saving run to Supabase:', error);
        throw error;
    }
}

/**
 * Get a specific run by ID
 */
export async function getRun(supabase: SupabaseClient, id: string): Promise<WorkflowRun | null> {
    const { data: run, error } = await supabase
        .from('rune_workflow_runs')
        .select(`
            *,
            steps:rune_run_steps(*)
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching run from Supabase:', error);
        return null;
    }

    if (!run) return null;

    return {
        id: run.id,
        workflowId: run.workflow_id,
        workflowVersionId: run.workflow_version_id,
        workflowName: run.workflow_name,
        status: run.status as WorkflowRun['status'],
        startTime: run.start_time,
        endTime: run.end_time,
        duration: run.duration,
        args: run.args as any[],
        result: run.result,
        error: run.error,
        logs: (run.logs as unknown as RunLog[]) || [],
        steps: ((run.steps as unknown as any[]) || []).map(s => ({
            ...s,
            startTime: s.started_at,  // Production uses started_at
            endTime: s.finished_at,    // Production uses finished_at
            durationMs: s.finished_at && s.started_at
                ? new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()
                : undefined,
            stepId: s.node_id,          // Production uses node_id
            stepLabel: s.node_id,       // No step_label in production, use node_id
            result: s.output_json       // Production uses output_json
        })).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
        waitingFor: run.waiting_for as unknown as WaitingFor | undefined
    };
}

/**
 * List all runs
 */
export async function listRuns(supabase: SupabaseClient): Promise<WorkflowRun[]> {
    const { data: runs, error } = await supabase
        .from('rune_workflow_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error listing runs from Supabase:', error);
        return [];
    }

    return (runs || []).map(run => ({
        id: run.id,
        workflowId: run.workflow_id,
        workflowVersionId: run.workflow_version_id,
        workflowName: run.workflow_name,
        status: run.status as WorkflowRun['status'],
        startTime: run.start_time,
        endTime: run.end_time,
        duration: run.duration,
        args: run.args as any[],
        result: run.result,
        error: run.error,
        logs: [], // Omit logs in list
        steps: [], // Omit steps in list
        waitingFor: run.waiting_for as unknown as WaitingFor | undefined
    }));
}

/**
 * Append a log entry to a run (using direct update)
 */
export async function appendLog(supabase: SupabaseClient, runId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message
    };

    // Fetch current logs, append, and update
    // This is less efficient but doesn't rely on RPC
    const { data: run } = await supabase
        .from('rune_workflow_runs')
        .select('logs')
        .eq('id', runId)
        .single();

    const currentLogs = (run?.logs as any[]) || [];
    const updatedLogs = [...currentLogs, logEntry];

    const { error } = await supabase
        .from('rune_workflow_runs')
        .update({ logs: updatedLogs })
        .eq('id', runId);

    if (error) {
        console.warn('Log append error (non-fatal):', error);
        // Don't throw - logging is non-critical
    }
}

/**
 * Update run status (direct update)
 */
export async function updateRunStatus(
    supabase: SupabaseClient,
    runId: string,
    status: WorkflowRun['status'],
    result?: any,
    error?: string // error message
): Promise<void> {

    // Construct updates object
    const updates: any = { status };
    if (result !== undefined) updates.result = result;
    if (error !== undefined) updates.error = error;
    if (status === 'completed' || status === 'failed') {
        updates.end_time = new Date().toISOString();
    }

    const { error: updateError } = await supabase
        .from('rune_workflow_runs')
        .update(updates)
        .eq('id', runId);

    if (updateError) throw updateError;
}

/**
 * Update or add a step execution record (Atomic)
 */
export async function updateStepExecution(
    supabase: SupabaseClient,
    runId: string,
    stepExecution: StepExecution,
    userId: string
): Promise<void> {
    await recordRunProgress(supabase, runId, stepExecution, userId);
}

/**
 * Record atomic run progress using direct insert (production schema)
 * Production table columns: node_id, started_at, finished_at, input_json, output_json, error_json
 */
export async function recordRunProgress(
    supabase: SupabaseClient,
    runId: string,
    stepExecution: StepExecution,
    userId: string,
    logEntry?: RunLog,
    runUpdates?: Partial<WorkflowRun>
): Promise<void> {

    // 1. Insert/Update step in rune_run_steps with production column names
    const stepData = {
        run_id: runId,
        user_id: userId,
        node_id: stepExecution.stepId, // Production uses node_id, not step_id
        status: stepExecution.status,
        started_at: stepExecution.startTime,
        finished_at: stepExecution.endTime,
        attempts: 1,
        output_json: stepExecution.result, // Production uses output_json, not output
        error_json: stepExecution.error ? { message: stepExecution.error } : null, // Production uses error_json
    };

    const { error: stepError } = await supabase
        .from('rune_run_steps')
        .insert(stepData);

    if (stepError) {
        console.warn('Step insert error (non-fatal):', stepError);
        // Don't throw - step logging is non-critical
    }

    // 2. Append log to workflow run (if provided) - skipped in step recording
    // Log appending is handled by appendLog function separately

    // 3. Update run status (if provided)
    if (runUpdates) {
        const updateData: any = {};
        if (runUpdates.status) updateData.status = runUpdates.status;
        if (runUpdates.result !== undefined) updateData.result = runUpdates.result;
        if (runUpdates.error !== undefined) updateData.error = runUpdates.error;
        if (runUpdates.endTime) updateData.end_time = runUpdates.endTime;

        if (Object.keys(updateData).length > 0) {
            const { error: updateError } = await supabase
                .from('rune_workflow_runs')
                .update(updateData)
                .eq('id', runId);

            if (updateError) throw updateError;
        }
    }
}

/**
 * Mark a run as waiting for an event or approval
 */
export async function setRunWaiting(
    supabase: SupabaseClient,
    runId: string,
    waitingFor: WaitingFor
): Promise<void> {
    const { error } = await supabase
        .from('rune_workflow_runs')
        .update({
            status: 'waiting',
            waiting_for: waitingFor
        })
        .eq('id', runId);

    if (error) throw error;
}

/**
 * Resume a waiting run (clear the waiting state)
 */
export async function resumeRun(supabase: SupabaseClient, runId: string): Promise<void> {
    const { error } = await supabase
        .from('rune_workflow_runs')
        .update({
            status: 'running',
            waiting_for: null
        })
        .eq('id', runId);

    if (error) throw error;
}

/**
 * Get runs that are waiting for a specific event or approval
 */
export async function getWaitingRuns(
    supabase: SupabaseClient,
    type: 'event' | 'approval',
    identifier?: string
): Promise<WorkflowRun[]> {

    let query = supabase
        .from('rune_workflow_runs')
        .select('*')
        .eq('status', 'waiting')
        .eq('waiting_for->>type', type);

    if (identifier) {
        query = query.eq('waiting_for->>identifier', identifier);
    }

    const { data: runs, error } = await query;

    if (error) {
        console.error('Error fetching waiting runs:', error);
        return [];
    }

    return (runs || []).map(run => ({
        id: run.id,
        workflowId: run.workflow_id,
        workflowVersionId: run.workflow_version_id,
        workflowName: run.workflow_name,
        status: run.status as WorkflowRun['status'],
        startTime: run.start_time,
        endTime: run.end_time,
        duration: run.duration,
        args: run.args as any[],
        result: run.result,
        error: run.error,
        logs: (run.logs as unknown as RunLog[]) || [],
        steps: (run.steps as unknown as StepExecution[]) || [],
        waitingFor: run.waiting_for as unknown as WaitingFor | undefined
    }));
}

/**
 * Purge completed runs older than the specified age.
 */
export async function purgeOldRuns(supabase: SupabaseClient, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeMs).toISOString();

    const { error, count } = await supabase
        .from('rune_workflow_runs')
        .delete({ count: 'exact' })
        .in('status', ['completed', 'failed'])
        .lt('created_at', cutoffDate);

    if (error) {
        console.error('Error purging old runs:', error);
        return 0;
    }

    if (count && count > 0) {
        console.log(`[Run Store] Purged ${count} old runs`);
    }

    return count || 0;
}

/**
 * Clear all completed/failed runs.
 */
export async function clearCompletedRuns(supabase: SupabaseClient): Promise<number> {

    const { error, count } = await supabase
        .from('rune_workflow_runs')
        .delete({ count: 'exact' })
        .in('status', ['completed', 'failed']);

    if (error) {
        console.error('Error clearing completed runs:', error);
        return 0;
    }

    return count || 0;
}
