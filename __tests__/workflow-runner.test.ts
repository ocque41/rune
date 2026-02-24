import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { Node, Edge } from '@xyflow/react';

// Mock run-store
vi.mock('@/lib/run-store', () => ({
    saveRun: vi.fn(),
    updateRunStatus: vi.fn(),
    updateStepExecution: vi.fn(),
    setRunWaiting: vi.fn(),
    appendLog: vi.fn(),
}));

// Mock fetch for HTTP steps
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase client
const mockSupabase = {} as any;

describe('WorkflowEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default success fetch response
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ simulated: true }),
            headers: new Map([['content-type', 'application/json']]),
        });
    });

    it('should execute a simple linear workflow', async () => {
        const nodes: Node[] = [
            { id: 'start', type: 'step', data: { label: 'Start Workflow' }, position: { x: 0, y: 0 } },
            { id: 'step1', type: 'step', data: { label: 'HTTP Request', httpRequest: { url: 'https://api.test.com', method: 'GET' } }, position: { x: 100, y: 0 } }
        ];
        const edges: Edge[] = [
            { id: 'e1', source: 'start', target: 'step1' }
        ];

        const engine = new WorkflowEngine(mockSupabase, 'wf-1', 'Test Workflow', nodes, edges, 'test-user-id');
        const result = await engine.run({ initial: 'data' });

        expect(result.status).toBe('completed');
        expect(mockFetch).toHaveBeenCalledWith('https://api.test.com', expect.any(Object));
    });

    it('should handle if/else condition (true path)', async () => {
        const nodes: Node[] = [
            { id: 'start', type: 'step', data: { label: 'Start Workflow' }, position: { x: 0, y: 0 } },
            { id: 'if1', type: 'if', data: { label: 'If / Else', condition: 'params.value > 5' }, position: { x: 100, y: 0 } },
            { id: 'trueNode', type: 'step', data: { label: 'Transform', transformConfig: { expression: 'return "path true"' } }, position: { x: 200, y: -50 } },
            { id: 'falseNode', type: 'step', data: { label: 'Transform', transformConfig: { expression: 'return "path false"' } }, position: { x: 200, y: 50 } }
        ];
        const edges: Edge[] = [
            { id: 'e1', source: 'start', target: 'if1' },
            { id: 'e2', source: 'if1', target: 'trueNode', sourceHandle: 'true' }, // Match logic in engine
            { id: 'e3', source: 'if1', target: 'falseNode', sourceHandle: 'false' }
        ];

        const engine = new WorkflowEngine(mockSupabase, 'wf-if', 'Condition Workflow', nodes, edges, 'test-user-id');
        const result = await engine.run({ value: 10 }); // 10 > 5 is true

        expect(result.status).toBe('completed');
        // trueNode should execute
        // Check result of trueNode in final output? Engine returns context.inputs keyed by nodeId
        // @ts-ignore
        expect(result.result['trueNode']).toEqual({
            status: 'success',
            result: 'path true',
            timing: expect.any(Object)
        });
        // falseNode should NOT execute
        // @ts-ignore
        expect(result.result['falseNode']).toBeUndefined();
    });

    it('should emergency-stop circular runs at execution cap', async () => {
        // self-loop to trigger circular emergency cap
        const nodes: Node[] = [
            { id: 'start', type: 'step', data: { label: 'Start Workflow' }, position: { x: 0, y: 0 } },
            { id: 'loop1', type: 'step', data: { label: 'Transform', transformConfig: { expression: 'return 1' } }, position: { x: 100, y: 0 } }
        ];
        const edges: Edge[] = [
            { id: 'e1', source: 'start', target: 'loop1' },
            { id: 'e2', source: 'loop1', target: 'loop1' } // Infinite loop
        ];

        const engine = new WorkflowEngine(
            mockSupabase,
            'wf-loop',
            'Loop Workflow',
            nodes,
            edges,
            'test-user-id',
            undefined,
            'circular',
            { max_node_executions: 5, max_runtime_minutes: 1440, alert_thresholds: [60, 80, 95] },
        );

        await expect(engine.run()).rejects.toThrow('Emergency stop');
    });
});
