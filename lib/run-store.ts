import fs from 'fs/promises';
import path from 'path';

export interface RunLog {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
}

export interface WorkflowRun {
    id: string;
    workflowName: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: string;
    endTime?: string;
    duration?: number;
    args: any[];
    result?: any;
    error?: string;
    logs: RunLog[];
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
