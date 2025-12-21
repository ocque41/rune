import { createAdminClient } from '@/lib/supabase/server';
import { PostgrestError } from '@supabase/supabase-js';

// Types
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
    workflowId?: string; // Added optional field
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
export async function saveRun(run: WorkflowRun): Promise<void> {
    const supabase = createAdminClient();

    const runData = {
        id: run.id,
        workflow_id: run.workflowId || null,
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
        // user_id will default to 0000... if not provided by RLS or default
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
export async function getRun(id: string): Promise<WorkflowRun | null> {
    const supabase = createAdminClient();

    const { data: run, error } = await supabase
        .from('rune_workflow_runs')
        .select('*')
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
    };
}

/**
 * List all runs
 */
export async function listRuns(): Promise<WorkflowRun[]> {
    const supabase = createAdminClient();

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
 * Append a log entry to a run
 */
export async function appendLog(runId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const run = await getRun(runId);
    if (run) {
        run.logs.push({
            timestamp: new Date().toISOString(),
            level,
            message
        });
        await saveRun(run);
    }
}

/**
 * Update run status
 */
export async function updateRunStatus(
    runId: string,
    status: WorkflowRun['status'],
    result?: any,
    error?: string
): Promise<void> {
    const run = await getRun(runId);
    if (run) {
        run.status = status;
        if (status === 'completed' || status === 'failed') {
            run.endTime = new Date().toISOString();
            if (run.startTime) {
                run.duration = new Date(run.endTime).getTime() - new Date(run.startTime).getTime();
            }
        }
        if (result !== undefined) run.result = result;
        if (error !== undefined) run.error = error;

        await saveRun(run);
    }
}

/**
 * Update or add a step execution record
 */
export async function updateStepExecution(
    runId: string,
    stepExecution: StepExecution
): Promise<void> {
    const run = await getRun(runId);
    if (run) {
        if (!run.steps) {
            run.steps = [];
        }

        const existingIndex = run.steps.findIndex(s => s.stepId === stepExecution.stepId);
        if (existingIndex >= 0) {
            run.steps[existingIndex] = stepExecution;
        } else {
            run.steps.push(stepExecution);
        }

        await saveRun(run);
    }
}

/**
 * Mark a run as waiting for an event or approval
 */
export async function setRunWaiting(
    runId: string,
    waitingFor: WaitingFor
): Promise<void> {
    const run = await getRun(runId);
    if (run) {
        run.status = 'waiting';
        run.waitingFor = waitingFor;
        await saveRun(run);
    }
}

/**
 * Resume a waiting run (clear the waiting state)
 */
export async function resumeRun(runId: string): Promise<void> {
    const run = await getRun(runId);
    if (run && run.status === 'waiting') {
        run.status = 'running';
        run.waitingFor = undefined;
        await saveRun(run);
    }
}

/**
 * Get runs that are waiting for a specific event or approval
 */
export async function getWaitingRuns(
    type: 'event' | 'approval',
    identifier?: string
): Promise<WorkflowRun[]> {
    const supabase = createAdminClient();

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
export async function purgeOldRuns(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const supabase = createAdminClient();
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
export async function clearCompletedRuns(): Promise<number> {
    const supabase = createAdminClient();

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
