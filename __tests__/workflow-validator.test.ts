import { describe, it, expect } from 'vitest';
import { validateGraph } from '@/lib/workflow-validator';
import { Node, Edge } from '@xyflow/react';

describe('Workflow Validator', () => {
    it('should invalidate graph without a start node', () => {
        const nodes: Node[] = [
            { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'HTTP Request' } }
        ];
        const edges: Edge[] = [];

        const result = validateGraph(nodes, edges);
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('NO_START_NODE');
    });

    it('should validate a correct simple graph', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            {
                id: '2',
                type: 'step',
                position: { x: 0, y: 100 },
                data: {
                    label: 'HTTP Request',
                    httpRequest: { url: 'https://example.com' }
                }
            }
        ];
        const edges: Edge[] = [
            { id: 'e1', source: '1', target: '2' }
        ];

        const result = validateGraph(nodes, edges);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should detect cycles', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Step A' } },
            { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'Step B' } }
        ];

        // Cycle: 1 -> 2 -> 3 -> 2
        const edges: Edge[] = [
            { id: 'e1', source: '1', target: '2' },
            { id: 'e2', source: '2', target: '3' },
            { id: 'e3', source: '3', target: '2' }
        ];

        const result = validateGraph(nodes, edges);
        expect(result.valid).toBe(false);
        expect(result.errors[0].code).toBe('CYCLE_DETECTED');
    });

    it('should warn about disconnected nodes', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Connected' } },
            { id: '3', type: 'step', position: { x: 100, y: 100 }, data: { label: 'Disconnected' } }
        ];

        const edges: Edge[] = [
            { id: 'e1', source: '1', target: '2' }
        ];

        const result = validateGraph(nodes, edges);
        // Warnings don't mark valid as false currently in validateGraph implementation
        // Just checking the warnings array
        expect(result.warnings.some(w => w.code === 'DISCONNECTED_NODE')).toBe(true);
    });

    it('should fail on missing required configuration', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            {
                id: '2',
                type: 'step',
                position: { x: 0, y: 100 },
                data: { label: 'HTTP Request', httpRequest: { url: '' } } // Missing URL
            }
        ];
        const edges: Edge[] = [{ id: 'e1', source: '1', target: '2' }];

        const result = validateGraph(nodes, edges);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true);
    });
});
