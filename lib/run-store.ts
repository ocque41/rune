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
export async function saveRun(supabase: SupabaseClient, run: WorkflowRun): Promise<void> {
    const runData = {
        id: run.id,
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
            startTime: s.start_time,
            endTime: s.end_time,
            durationMs: s.duration_ms,
            stepId: s.step_id,
            stepLabel: s.step_label,
            result: s.output
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
 * Append a log entry to a run (Atomic)
 */
export async function appendLog(supabase: SupabaseClient, runId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message
    };

    const { error } = await supabase.rpc('record_run_progress', {
        p_run_id: runId,
        p_step_data: null,
        p_log_entry: [logEntry],
        p_run_updates: null
    });

    if (error) throw error;
}

/**
 * Update run status (Atomic)
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
        updates.endTime = new Date().toISOString();
    }

    const { error: rpcError } = await supabase.rpc('record_run_progress', {
        p_run_id: runId,
        p_step_data: null,
        p_log_entry: null,
        p_run_updates: updates
    });

    if (rpcError) throw rpcError;
}

/**
 * Update or add a step execution record (Atomic)
 */
export async function updateStepExecution(
    supabase: SupabaseClient,
    runId: string,
    stepExecution: StepExecution
): Promise<void> {
    await recordRunProgress(supabase, runId, stepExecution);
}

/**
 * Record atomic run progress using RPC
 */
export async function recordRunProgress(
    supabase: SupabaseClient,
    runId: string,
    stepExecution: StepExecution,
    logEntry?: RunLog,
    runUpdates?: Partial<WorkflowRun>
): Promise<void> {

    const stepPayload = {
        ...stepExecution,
        result: stepExecution.result,
        error: stepExecution.error
    };

    const { error } = await supabase.rpc('record_run_progress', {
        p_run_id: runId,
        p_step_data: stepPayload,
        p_log_entry: logEntry ? [logEntry] : null,
        p_run_updates: runUpdates || null
    });

    if (error) throw error;
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
