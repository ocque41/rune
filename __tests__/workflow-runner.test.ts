import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs/promises';

// Mock the fs module for run-store
vi.mock('fs/promises', () => ({
    default: {
        access: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn()
    }
}));

// Mock the workflow/api module
vi.mock('workflow/api', () => ({
    start: vi.fn()
}));

describe('Workflow Run API Route', () => {
    let POST: (req: NextRequest) => Promise<Response>;
    let mockStart: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        // Setup fs mocks
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockResolvedValue('[]');
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);

        // Get mock reference
        const workflowApi = await import('workflow/api');
        mockStart = vi.mocked(workflowApi.start);

        // Import the route handler
        const route = await import('@/app/api/workflows/run/route');
        POST = route.POST;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return 400 if workflow name is missing', async () => {
        const request = new NextRequest('http://localhost/api/workflows/run', {
            method: 'POST',
            body: JSON.stringify({})
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Missing workflow name');
    });

    it('should return 404 if workflow module not found', async () => {
        const request = new NextRequest('http://localhost/api/workflows/run', {
            method: 'POST',
            body: JSON.stringify({ name: 'nonexistent-workflow' })
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toContain('not found');
    });

    it('should sanitize workflow name to prevent directory traversal', async () => {
        const request = new NextRequest('http://localhost/api/workflows/run', {
            method: 'POST',
            body: JSON.stringify({ name: '../../../etc/passwd' })
        });

        const response = await POST(request);
        // Should try to import a sanitized name, not the malicious path
        // The import will fail, but it should not traverse directories
        expect(response.status).toBe(404);
    });

    // Note: Tests that require actual workflow module imports would need
    // full integration infrastructure with real workflow files in the
    // workflows/ directory. For unit tests, we verify the mechanics
    // through the lifecycle assertions below.
});


describe('Runner lifecycle assertions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('run-store saveRun should be called with correct structure', async () => {
        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockResolvedValue('[]');
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);

        const { saveRun } = await import('@/lib/run-store');

        await saveRun({
            id: 'test-run-123',
            workflowName: 'test-workflow',
            status: 'running',
            startTime: new Date().toISOString(),
            args: [{ foo: 'bar' }],
            logs: [{ timestamp: new Date().toISOString(), level: 'info', message: 'Started' }]
        });

        const writeCall = vi.mocked(fs.writeFile).mock.calls[0];
        const writtenData = JSON.parse(writeCall[1] as string);

        expect(writtenData[0]).toMatchObject({
            id: 'test-run-123',
            workflowName: 'test-workflow',
            status: 'running'
        });
        expect(writtenData[0].logs).toHaveLength(1);
    });

    it('updateRunStatus should transition run to completed with result', async () => {
        const existingRun = {
            id: 'run-456',
            workflowName: 'test',
            status: 'running',
            startTime: new Date().toISOString(),
            args: [],
            logs: []
        };

        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([existingRun]));
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);

        const { updateRunStatus } = await import('@/lib/run-store');
        await updateRunStatus('run-456', 'completed', { output: 'success' });

        const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);

        expect(writtenData[0].status).toBe('completed');
        expect(writtenData[0].result).toEqual({ output: 'success' });
        expect(writtenData[0].endTime).toBeDefined();
        expect(writtenData[0].duration).toBeDefined();
    });

    it('updateRunStatus should transition run to failed with error', async () => {
        const existingRun = {
            id: 'run-789',
            workflowName: 'test',
            status: 'running',
            startTime: new Date().toISOString(),
            args: [],
            logs: []
        };

        vi.mocked(fs.access).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([existingRun]));
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);

        const { updateRunStatus } = await import('@/lib/run-store');
        await updateRunStatus('run-789', 'failed', undefined, 'Network timeout');

        const writtenData = JSON.parse(vi.mocked(fs.writeFile).mock.calls[0][1] as string);

        expect(writtenData[0].status).toBe('failed');
        expect(writtenData[0].error).toBe('Network timeout');
    });
});

