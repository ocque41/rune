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

    it('should generate code for Parallel nodes with Promise.all', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            { id: '2', type: 'parallel', position: { x: 0, y: 100 }, data: { label: 'Parallel', branches: 2 } },
            { id: '3', type: 'step', position: { x: -50, y: 200 }, data: { label: 'Branch A' } },
            { id: '4', type: 'step', position: { x: 50, y: 200 }, data: { label: 'Branch B' } },
            { id: '5', type: 'step', position: { x: 0, y: 300 }, data: { label: 'After Merge' } }
        ];

        const edges: Edge[] = [
            { id: 'e1-2', source: '1', target: '2' },
            { id: 'e2-3', source: '2', target: '3', sourceHandle: 'branch-0' },
            { id: 'e2-4', source: '2', target: '4', sourceHandle: 'branch-1' },
            { id: 'e2-5', source: '2', target: '5', sourceHandle: 'merge' }
        ];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('Promise.all');
        expect(code).toContain('async () =>');
        expect(code).toContain('branchA');
        expect(code).toContain('branchB');
    });

    it('should generate retry wrapper with error handling', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            {
                id: '2',
                type: 'step',
                position: { x: 0, y: 100 },
                data: {
                    label: 'HTTP Request',
                    httpRequest: { url: 'https://api.example.com', method: 'GET' },
                    errorConfig: {
                        maxRetries: 5,
                        backoffPolicy: 'exponential',
                        baseDelay: '2s',
                        failureAction: 'retry'
                    }
                }
            }
        ];
        const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('attempt <= 5');
        expect(code).toContain('calculateBackoff');
        expect(code).toContain('exponential');
        expect(code).toContain('Max retries');
    });

    it('should generate database query code for different DB types', () => {
        const baseNodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } }
        ];

        // Test PostgreSQL
        const pgNodes: Node[] = [...baseNodes, {
            id: '2',
            type: 'step',
            position: { x: 0, y: 100 },
            data: {
                label: 'Database Query',
                dbConfig: { dbType: 'postgres', connectionString: 'postgres://...', query: 'SELECT * FROM users' }
            }
        }];
        const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];
        const pgCode = generateWorkflowCode(pgNodes, edges);
        expect(pgCode).toContain('queryPostgres');

        // Test MySQL
        const mysqlNodes: Node[] = [...baseNodes, {
            id: '2',
            type: 'step',
            position: { x: 0, y: 100 },
            data: {
                label: 'Database Query',
                dbConfig: { dbType: 'mysql', connectionString: 'mysql://...', query: 'SELECT * FROM users' }
            }
        }];
        const mysqlCode = generateWorkflowCode(mysqlNodes, edges);
        expect(mysqlCode).toContain('queryMysql');

        // Test MongoDB
        const mongoNodes: Node[] = [...baseNodes, {
            id: '2',
            type: 'step',
            position: { x: 0, y: 100 },
            data: {
                label: 'Database Query',
                dbConfig: { dbType: 'mongodb', connectionString: 'mongodb://...', query: '{"collection":"users","operation":"find"}' }
            }
        }];
        const mongoCode = generateWorkflowCode(mongoNodes, edges);
        expect(mongoCode).toContain('queryMongodb');

        // Test Generic
        const genericNodes: Node[] = [...baseNodes, {
            id: '2',
            type: 'step',
            position: { x: 0, y: 100 },
            data: {
                label: 'Database Query',
                dbConfig: { dbType: 'generic', connectionString: 'custom://...', query: 'CUSTOM QUERY' }
            }
        }];
        const genericCode = generateWorkflowCode(genericNodes, edges);
        expect(genericCode).toContain('queryGeneric');
    });

    it('should generate sub-workflow import and invocation', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            {
                id: '2',
                type: 'subWorkflow',
                position: { x: 0, y: 100 },
                data: {
                    label: 'Sub-Workflow',
                    workflowId: 'processPayment',
                    params: '{"amount": 100}'
                }
            }
        ];
        const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('import { processPayment }');
        expect(code).toContain('workflows/processPayment');
        expect(code).toContain('await processPayment');
    });

    it('should generate schedule configuration export', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            {
                id: '2',
                type: 'schedule',
                position: { x: 0, y: 100 },
                data: {
                    label: 'Schedule',
                    scheduleConfig: { cron: '0 9 * * 1-5', timezone: 'America/New_York' }
                }
            }
        ];
        const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

        const code = generateWorkflowCode(nodes, edges);

        // Schedule config should be exported
        expect(code).toContain('schedule');
    });

    it('should include sandbox mode detection in generated step functions', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
            {
                id: '2',
                type: 'step',
                position: { x: 0, y: 100 },
                data: { label: 'HTTP Request', httpRequest: { url: 'https://api.example.com', method: 'GET' } }
            }
        ];
        const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('RUNE_WORKFLOW_MODE');
        expect(code).toContain('sandbox');
    });

    it('should include helper functions for retry logic', () => {
        const nodes: Node[] = [
            { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } }
        ];
        const edges: Edge[] = [];

        const code = generateWorkflowCode(nodes, edges);

        expect(code).toContain('parseDuration');
        expect(code).toContain('calculateBackoff');
        expect(code).toContain('withTimeout');
        expect(code).toContain('FatalError');
        expect(code).toContain('RetryableError');
    });
});

