import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowEngine } from '@/lib/workflow-engine';
import { ExportedWorkflow } from '@/lib/types/export';
import { Node, Edge } from '@xyflow/react';

// Mock run-store
vi.mock('@/lib/run-store', () => ({
    saveRun: vi.fn(),
    updateRunStatus: vi.fn(),
    updateStepExecution: vi.fn(),
    setRunWaiting: vi.fn(),
}));

describe('Production Workflow Execution', () => {
    // Define a production workflow object
    const productionWorkflow: ExportedWorkflow = {
        id: 'prod-wf-v1',
        version: '1.0.0',
        meta: {
            name: 'Production Workflow',
            description: 'Critical business process'
        },
        nodes: [
            { id: 'start', type: 'step', data: { label: 'Start Workflow' }, position: { x: 0, y: 0 } },
            { id: 'step1', type: 'step', data: { label: 'Transform', transformConfig: { expression: 'return "processed"' } }, position: { x: 100, y: 0 } }
        ] as Node[],
        edges: [
            { id: 'e1', source: 'start', target: 'step1' }
        ] as Edge[]
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should execute with the initial production ID', async () => {
        const engine = new WorkflowEngine(
            productionWorkflow.id,
            productionWorkflow.meta.name,
            productionWorkflow.nodes,
            productionWorkflow.edges
        );

        const result = await engine.run({ initial: 'data' });

        expect(result.workflowId).toBe('prod-wf-v1');
        expect(result.status).toBe('completed');
    });

    it('should allow changing the workflow ID and execute as a new identity', async () => {
        // Clone and modify ID
        const clonedWorkflow = { ...productionWorkflow };
        clonedWorkflow.id = 'prod-wf-v2-hotfix';

        const engine = new WorkflowEngine(
            clonedWorkflow.id,
            clonedWorkflow.meta.name,
            clonedWorkflow.nodes,
            clonedWorkflow.edges
        );

        const result = await engine.run({ initial: 'data' });

        expect(result.workflowId).toBe('prod-wf-v2-hotfix');
        expect(result.status).toBe('completed');
    });

    it('should maintain isolation between executions with different IDs', async () => {
        const wfA = { ...productionWorkflow, id: 'workflow-A' };
        const wfB = { ...productionWorkflow, id: 'workflow-B' };

        const engineA = new WorkflowEngine(wfA.id, wfA.meta.name, wfA.nodes, wfA.edges);
        const engineB = new WorkflowEngine(wfB.id, wfB.meta.name, wfB.nodes, wfB.edges);

        const runA = await engineA.run();
        const runB = await engineB.run();

        expect(runA.workflowId).toBe('workflow-A');
        expect(runB.workflowId).toBe('workflow-B');
        expect(runA.id).not.toBe(runB.id); // different run IDs
    });
});
