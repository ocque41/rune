import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveRun, getRun, updateStepExecution, setRunWaiting, resumeRun, getWaitingRuns, WorkflowRun } from '@/lib/run-store';

// Mock Supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockDelete = vi.fn();
const mockFrom = vi.fn();

const mockSupabase = {
    from: mockFrom,
};

// Chainable mocks - default setup
mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    upsert: mockUpsert,
    delete: mockDelete,
});

mockSelect.mockReturnValue({
    eq: mockEq,
    order: mockOrder,
});

mockEq.mockReturnValue({
    single: mockSingle,
    eq: mockEq, // For chaining multiple eqs
});

mockOrder.mockReturnValue({
    limit: mockLimit,
});

mockDelete.mockReturnValue({
    eq: mockEq,
    in: mockEq, // reusing mockEq for 'in' since it returns chainable
    lt: mockEq,
});

// Mock the server client creator
vi.mock('@/lib/supabase/server', () => ({
    createAdminClient: () => mockSupabase
}));

describe('Run Store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default return values just in case
        mockSelect.mockReturnValue({ eq: mockEq, order: mockOrder });
        mockEq.mockReturnValue({ single: mockSingle, eq: mockEq });

        // Ensure upsert returns a promise that resolves to success by default
        // Supabase upsert returns a Promise that resolves to { data, error }
        mockUpsert.mockResolvedValue({ error: null });
    });

    // Helper to create a mock run in DB format
    const createMockRun = (id: string): any => ({
        id,
        workflow_name: 'Test Workflow',
        status: 'running',
        start_time: new Date().toISOString(),
        logs: [],
        steps: [],
        args: [],
        waiting_for: null
    });

    describe('StepExecution tracking', () => {
        it('should updateStepExecution add a new step', async () => {
            const runId = 'run-1';
            const mockRun = createMockRun(runId);

            // Mock getRun response
            mockSingle.mockResolvedValueOnce({ data: mockRun, error: null });

            const newStep = {
                stepId: 'step-1',
                stepLabel: 'Test Step',
                status: 'running' as const,
                startTime: new Date().toISOString()
            };

            await updateStepExecution(runId, newStep);

            // Verify fetched
            expect(mockFrom).toHaveBeenCalledWith('rune_workflow_runs');

            // Verify upsert called with new step
            expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
                id: runId,
                steps: [newStep]
            }));
        });

        it('should update existing step instead of adding duplicate', async () => {
            const runId = 'run-1';
            const existingStep = {
                stepId: 'step-1',
                stepLabel: 'Test Step',
                status: 'running' as const,
                startTime: new Date().toISOString()
            };
            const mockRun = createMockRun(runId);
            mockRun.steps = [existingStep];

            mockSingle.mockResolvedValueOnce({ data: mockRun, error: null });

            const updatedStep = {
                ...existingStep,
                status: 'completed' as const,
                endTime: new Date().toISOString()
            };

            await updateStepExecution(runId, updatedStep);

            expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
                id: runId,
                steps: [updatedStep]
            }));
        });
    });

    describe('WaitingFor state management', () => {
        it('should setRunWaiting update run status and waitingFor', async () => {
            const runId = 'run-1';
            const mockRun = createMockRun(runId);
            mockSingle.mockResolvedValueOnce({ data: mockRun, error: null });

            const waitingFor = {
                type: 'event' as const,
                identifier: 'test-event',
                since: new Date().toISOString()
            };

            await setRunWaiting(runId, waitingFor);

            expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
                id: runId,
                status: 'waiting',
                waiting_for: waitingFor
            }));
        });

        it('should resumeRun clear waiting state', async () => {
            const runId = 'run-1';
            const mockRun = createMockRun(runId);
            mockRun.status = 'waiting';
            mockRun.waiting_for = { type: 'event', identifier: 'test' };

            mockSingle.mockResolvedValueOnce({ data: mockRun, error: null });

            await resumeRun(runId);

            expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
                id: runId,
                status: 'running',
                waiting_for: undefined
            }));
        });

        it('should getWaitingRuns filter by type', async () => {
            const mockRuns = [createMockRun('run-1')];

            // Setup chain for getWaitingRuns: select -> eq -> eq
            mockEq.mockReturnValue({
                eq: mockEq,
                then: (resolve: any) => resolve({ data: mockRuns, error: null }),
                single: mockSingle,
            });

            const results = await getWaitingRuns('event', 'test-event');
            expect(results).toHaveLength(1);
            expect(results[0].id).toBe('run-1');
        });
    });
});
