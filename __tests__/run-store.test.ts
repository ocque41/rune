import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Mock the fs module before importing run-store
vi.mock('fs/promises', () => ({
    default: {
        access: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn()
    }
}));

describe('Run Store', () => {
    let runStore: typeof import('@/lib/run-store');

    beforeEach(async () => {
        vi.clearAllMocks();
        // Reset module cache to get fresh import
        vi.resetModules();
        runStore = await import('@/lib/run-store');
    });

    describe('StepExecution tracking', () => {
        it('should updateStepExecution add a new step', async () => {
            const mockRuns = [{
                id: 'run-1',
                workflowName: 'test',
                status: 'running' as const,
                startTime: new Date().toISOString(),
                args: [],
                logs: [],
                steps: []
            }];

            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRuns));
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);

            await runStore.updateStepExecution('run-1', {
                stepId: 'step-1',
                stepLabel: 'HTTP Request',
                status: 'completed',
                durationMs: 150,
                result: { status: 200 }
            });

            expect(fs.writeFile).toHaveBeenCalled();
            const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
            expect(writtenData[0].steps).toHaveLength(1);
            expect(writtenData[0].steps[0].stepLabel).toBe('HTTP Request');
        });

        it('should update existing step instead of adding duplicate', async () => {
            const mockRuns = [{
                id: 'run-1',
                workflowName: 'test',
                status: 'running' as const,
                startTime: new Date().toISOString(),
                args: [],
                logs: [],
                steps: [{
                    stepId: 'step-1',
                    stepLabel: 'HTTP Request',
                    status: 'running' as const
                }]
            }];

            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRuns));
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);

            await runStore.updateStepExecution('run-1', {
                stepId: 'step-1',
                stepLabel: 'HTTP Request',
                status: 'completed',
                durationMs: 150
            });

            const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
            expect(writtenData[0].steps).toHaveLength(1); // Not 2
            expect(writtenData[0].steps[0].status).toBe('completed');
        });
    });

    describe('WaitingFor state management', () => {
        it('should setRunWaiting update run status and waitingFor', async () => {
            const mockRuns = [{
                id: 'run-1',
                workflowName: 'test',
                status: 'running' as const,
                startTime: new Date().toISOString(),
                args: [],
                logs: []
            }];

            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRuns));
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);

            await runStore.setRunWaiting('run-1', {
                type: 'approval',
                identifier: 'approval-manager@example.com',
                since: new Date().toISOString()
            });

            const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
            expect(writtenData[0].status).toBe('waiting');
            expect(writtenData[0].waitingFor.type).toBe('approval');
        });

        it('should resumeRun clear waiting state', async () => {
            const mockRuns = [{
                id: 'run-1',
                workflowName: 'test',
                status: 'waiting' as const,
                startTime: new Date().toISOString(),
                args: [],
                logs: [],
                waitingFor: {
                    type: 'event' as const,
                    identifier: 'payment_received',
                    since: new Date().toISOString()
                }
            }];

            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRuns));
            vi.mocked(fs.writeFile).mockResolvedValue(undefined);

            await runStore.resumeRun('run-1');

            const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);
            expect(writtenData[0].status).toBe('running');
            expect(writtenData[0].waitingFor).toBeUndefined();
        });

        it('should getWaitingRuns filter by type', async () => {
            const mockRuns = [
                {
                    id: 'run-1',
                    workflowName: 'test1',
                    status: 'waiting' as const,
                    startTime: new Date().toISOString(),
                    args: [],
                    logs: [],
                    waitingFor: { type: 'approval' as const, identifier: 'user@test.com', since: '' }
                },
                {
                    id: 'run-2',
                    workflowName: 'test2',
                    status: 'waiting' as const,
                    startTime: new Date().toISOString(),
                    args: [],
                    logs: [],
                    waitingFor: { type: 'event' as const, identifier: 'payment', since: '' }
                },
                {
                    id: 'run-3',
                    workflowName: 'test3',
                    status: 'running' as const,
                    startTime: new Date().toISOString(),
                    args: [],
                    logs: []
                }
            ];

            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRuns));

            const approvalRuns = await runStore.getWaitingRuns('approval');
            expect(approvalRuns).toHaveLength(1);
            expect(approvalRuns[0].id).toBe('run-1');

            const eventRuns = await runStore.getWaitingRuns('event');
            expect(eventRuns).toHaveLength(1);
            expect(eventRuns[0].id).toBe('run-2');
        });

        it('should getWaitingRuns filter by identifier', async () => {
            const mockRuns = [
                {
                    id: 'run-1',
                    status: 'waiting' as const,
                    startTime: '',
                    workflowName: 'test',
                    args: [],
                    logs: [],
                    waitingFor: { type: 'event' as const, identifier: 'payment', since: '' }
                },
                {
                    id: 'run-2',
                    status: 'waiting' as const,
                    startTime: '',
                    workflowName: 'test',
                    args: [],
                    logs: [],
                    waitingFor: { type: 'event' as const, identifier: 'shipment', since: '' }
                }
            ];

            vi.mocked(fs.access).mockResolvedValue(undefined);
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockRuns));

            const paymentRuns = await runStore.getWaitingRuns('event', 'payment');
            expect(paymentRuns).toHaveLength(1);
            expect(paymentRuns[0].id).toBe('run-1');
        });
    });
});
