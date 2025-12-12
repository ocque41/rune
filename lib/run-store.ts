import fs from 'fs/promises';
import path from 'path';

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


const RUNS_FILE = path.join(process.cwd(), '.runs.json');

// Ensure runs file exists
async function ensureRunsFile() {
    try {
        await fs.access(RUNS_FILE);
    } catch {
        await fs.writeFile(RUNS_FILE, JSON.stringify([]), 'utf-8');
    }
}

// Read all runs
async function readRuns(): Promise<WorkflowRun[]> {
    await ensureRunsFile();
    try {
        const data = await fs.readFile(RUNS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading runs file:', error);
        return [];
    }
}

// Write all runs
async function writeRuns(runs: WorkflowRun[]): Promise<void> {
    await fs.writeFile(RUNS_FILE, JSON.stringify(runs, null, 2), 'utf-8');
}

/**
 * Save a new run or update an existing one
 */
export async function saveRun(run: WorkflowRun): Promise<void> {
    const runs = await readRuns();
    const index = runs.findIndex(r => r.id === run.id);

    if (index >= 0) {
        runs[index] = run;
    } else {
        runs.unshift(run); // Add new runs to the beginning
    }

    // Limit to last 100 runs to prevent file from growing too large
    if (runs.length > 100) {
        runs.length = 100;
    }

    await writeRuns(runs);
}

/**
 * Get a specific run by ID
 */
export async function getRun(id: string): Promise<WorkflowRun | null> {
    const runs = await readRuns();
    return runs.find(r => r.id === id) || null;
}

/**
 * List all runs
 */
export async function listRuns(): Promise<WorkflowRun[]> {
    return readRuns();
}

/**
 * Append a log entry to a run
 */
export async function appendLog(runId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
    const runs = await readRuns();
    const run = runs.find(r => r.id === runId);

    if (run) {
        run.logs.push({
            timestamp: new Date().toISOString(),
            level,
            message
        });
        await writeRuns(runs);
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
    const runs = await readRuns();
    const run = runs.find(r => r.id === runId);

    if (run) {
        run.status = status;
        if (status === 'completed' || status === 'failed') {
            run.endTime = new Date().toISOString();
            run.duration = new Date(run.endTime).getTime() - new Date(run.startTime).getTime();
        }
        if (result !== undefined) run.result = result;
        if (error !== undefined) run.error = error;

        await writeRuns(runs);
    }
}

/**
 * Update or add a step execution record
 */
export async function updateStepExecution(
    runId: string,
    stepExecution: StepExecution
): Promise<void> {
    const runs = await readRuns();
    const run = runs.find(r => r.id === runId);

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

        await writeRuns(runs);
    }
}

/**
 * Mark a run as waiting for an event or approval
 */
export async function setRunWaiting(
    runId: string,
    waitingFor: WaitingFor
): Promise<void> {
    const runs = await readRuns();
    const run = runs.find(r => r.id === runId);

    if (run) {
        run.status = 'waiting';
        run.waitingFor = waitingFor;
        await writeRuns(runs);
    }
}

/**
 * Resume a waiting run (clear the waiting state)
 */
export async function resumeRun(runId: string): Promise<void> {
    const runs = await readRuns();
    const run = runs.find(r => r.id === runId);

    if (run && run.status === 'waiting') {
        run.status = 'running';
        run.waitingFor = undefined;
        await writeRuns(runs);
    }
}

/**
 * Get runs that are waiting for a specific event or approval
 */
export async function getWaitingRuns(
    type: 'event' | 'approval',
    identifier?: string
): Promise<WorkflowRun[]> {
    const runs = await readRuns();
    return runs.filter(r =>
        r.status === 'waiting' &&
        r.waitingFor?.type === type &&
        (identifier === undefined || r.waitingFor.identifier === identifier)
    );
}

/**
 * Purge completed runs older than the specified age.
 * 
 * TODO: When moving to DB, replace with proper archival/retention policy.
 * 
 * @param maxAgeMs - Maximum age in milliseconds. Runs older than this will be deleted.
 *                   Default: 7 days (604800000ms)
 * @returns Number of runs purged
 */
export async function purgeOldRuns(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    const runs = await readRuns();
    const now = Date.now();

    const filtered = runs.filter(run => {
        // Keep waiting/running runs regardless of age
        if (run.status === 'waiting' || run.status === 'running' || run.status === 'pending') {
            return true;
        }

        // Check age of completed/failed runs
        const runTime = new Date(run.endTime || run.startTime).getTime();
        return (now - runTime) < maxAgeMs;
    });

    const purgedCount = runs.length - filtered.length;

    if (purgedCount > 0) {
        await writeRuns(filtered);
        console.log(`[Run Store] Purged ${purgedCount} old runs`);
    }

    return purgedCount;
}

/**
 * Clear all completed/failed runs (keep pending/running/waiting).
 * Use with caution - this is destructive.
 */
export async function clearCompletedRuns(): Promise<number> {
    const runs = await readRuns();
    const active = runs.filter(r =>
        r.status === 'pending' || r.status === 'running' || r.status === 'waiting'
    );

    const clearedCount = runs.length - active.length;
    await writeRuns(active);

    return clearedCount;
}
