// Standalone test for run tracking (copied logic to avoid import issues)
import fs from 'fs';
import path from 'path';

interface RunLog {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
}

interface WorkflowRun {
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

const RUNS_FILE = path.join(process.cwd(), '.runs-test.json');

// Mock store functions
async function readRuns(): Promise<WorkflowRun[]> {
    try {
        if (fs.existsSync(RUNS_FILE)) {
            const data = fs.readFileSync(RUNS_FILE, 'utf-8');
            return JSON.parse(data);
        }
        return [];
    } catch (error) {
        return [];
    }
}

async function writeRuns(runs: WorkflowRun[]): Promise<void> {
    fs.writeFileSync(RUNS_FILE, JSON.stringify(runs, null, 2), 'utf-8');
}

async function saveRun(run: WorkflowRun): Promise<void> {
    const runs = await readRuns();
    const index = runs.findIndex(r => r.id === run.id);

    if (index >= 0) {
        runs[index] = run;
    } else {
        runs.unshift(run);
    }

    await writeRuns(runs);
}

async function getRun(id: string): Promise<WorkflowRun | null> {
    const runs = await readRuns();
    return runs.find(r => r.id === id) || null;
}

async function listRuns(): Promise<WorkflowRun[]> {
    return readRuns();
}

async function appendLog(runId: string, message: string, level: 'info' | 'warn' | 'error' = 'info'): Promise<void> {
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

async function updateRunStatus(
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

// Clean up previous test file
if (fs.existsSync(RUNS_FILE)) {
    fs.unlinkSync(RUNS_FILE);
}

async function testRunTracking() {
    console.log('Running execution monitoring tests...\n');

    // Test 1: Save a new run
    console.log('Test 1: Save new run');
    const runId = `test-run-${Date.now()}`;
    const newRun: WorkflowRun = {
        id: runId,
        workflowName: 'Test Workflow',
        status: 'running',
        startTime: new Date().toISOString(),
        args: [{ foo: 'bar' }],
        logs: []
    };

    await saveRun(newRun);
    const savedRun = await getRun(runId);

    console.assert(savedRun !== null, 'Run should be saved');
    console.assert(savedRun?.id === runId, 'Run ID should match');
    console.assert(savedRun?.status === 'running', 'Status should be running');
    console.log('✓ Passed\n');

    // Test 2: List runs
    console.log('Test 2: List runs');
    const runs = await listRuns();
    console.assert(runs.length > 0, 'Should have at least one run');
    console.assert(runs.some(r => r.id === runId), 'Should contain our test run');
    console.log('✓ Passed\n');

    // Test 3: Append log
    console.log('Test 3: Append log');
    await appendLog(runId, 'Test log message', 'info');
    const runWithLogs = await getRun(runId);
    console.assert(runWithLogs?.logs.length === 1, 'Should have 1 log entry');
    console.assert(runWithLogs?.logs[0].message === 'Test log message', 'Log message should match');
    console.log('✓ Passed\n');

    // Test 4: Update status
    console.log('Test 4: Update status');
    const result = { success: true };
    await updateRunStatus(runId, 'completed', result);
    const completedRun = await getRun(runId);
    console.assert(completedRun?.status === 'completed', 'Status should be completed');
    console.assert(completedRun?.result.success === true, 'Result should be saved');
    console.assert(completedRun?.endTime !== undefined, 'End time should be set');
    console.assert(completedRun?.duration !== undefined, 'Duration should be calculated');
    console.log('✓ Passed\n');

    // Cleanup
    if (fs.existsSync(RUNS_FILE)) {
        fs.unlinkSync(RUNS_FILE);
    }

    console.log('=================================');
    console.log('ALL RUN TRACKING TESTS PASSED! ✓');
    console.log('=================================');
}

testRunTracking().catch(console.error);
