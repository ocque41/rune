import { describe, it, expect } from 'vitest';
import { generateWorkflowCode } from '@/lib/workflow-generator';
import { Node, Edge } from '@xyflow/react';

describe('Workflow Generator', () => {
    it('should generate code for a simple linear workflow', () => {
        const nodes: Node[] = [
            {
                id: '1',
                type: 'step',
                position: { x: 0, y: 0 },
                data: { label: 'Start Workflow' }
            },
            {
                id: '2',
                type: 'step',
                position: { x: 0, y: 100 },
                data: { label: 'HTTP Request', httpRequest: { url: 'https://api.example.com', method: 'GET' } }
            }
        ];
        const edges: Edge[] = [
            { id: 'e1-2', source: '1', target: '2' }
        ];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('"use workflow"');
        expect(code).toContain('import { sleep');
        expect(code).toContain('makeHttpRequest');
        expect(code).toContain('https://api.example.com');
    });

    it('should generate code for an If condition', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'if', position: { x: 0, y: 100 }, data: { label: 'Check Status', condition: 'params.status === 200' } },
            { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'Success Step' } },
            { id: '4', type: 'step', position: { x: 100, y: 200 }, data: { label: 'Fail Step' } }
        ];

        const edges: Edge[] = [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true' },
            { id: 'e2-4', source: '2', target: '4', sourceHandle: 'false' }
        ];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('if (params.status === 200)');
        expect(code).toContain('successStep');
        expect(code).toContain('failStep');
    });

    it('should generate code for Loops', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'loop', position: { x: 0, y: 100 }, data: { label: 'Loop Items', items: 'params.items' } },
            { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'Process Item' } }
        ];

        const edges: Edge[] = [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'body' }
        ];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('for (const item of params.items)');
        expect(code).toContain('processItem');
    });
});
