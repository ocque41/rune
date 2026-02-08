import { describe, it, expect, beforeEach } from 'vitest';
import { simulateWorkflow, validateWorkflowConfig } from '@/lib/workflow-simulator';
import { Node, Edge } from '@xyflow/react';

describe('Workflow Simulator', () => {
    describe('validateWorkflowConfig', () => {
        it('should return no issues for a valid workflow', () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
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

            const issues = validateWorkflowConfig(nodes, edges);
            expect(issues).toHaveLength(0);
        });

        it('should warn about disconnected nodes', () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Connected' } },
                { id: '3', type: 'step', position: { x: 200, y: 100 }, data: { label: 'Orphan Node' } }
            ];
            const edges: Edge[] = [
                { id: 'e1-2', source: '1', target: '2' }
            ];

            const issues = validateWorkflowConfig(nodes, edges);
            expect(issues.some(i => i.severity === 'warning' && i.nodeId === '3')).toBe(true);
        });

        it('should error on HTTP Request missing URL', () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'HTTP Request', httpRequest: {} } }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const issues = validateWorkflowConfig(nodes, edges);
            expect(issues.some(i => i.severity === 'error' && i.message.includes('URL'))).toBe(true);
        });

        it('should error on Send Email missing recipient', () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Send Email', emailConfig: {} } }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const issues = validateWorkflowConfig(nodes, edges);
            expect(issues.some(i => i.severity === 'error' && i.message.includes('recipient'))).toBe(true);
        });

        it('should error on Slack Message missing webhook', () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Slack Message', slackConfig: {} } }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const issues = validateWorkflowConfig(nodes, edges);
            expect(issues.some(i => i.severity === 'error' && i.message.includes('Webhook'))).toBe(true);
        });
    });

    describe('simulateWorkflow', () => {
        it('should fail without a Start Workflow node', async () => {
            const nodes: Node[] = [
                { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Some Step' } }
            ];
            const edges: Edge[] = [];

            const result = await simulateWorkflow(nodes, edges, {});

            expect(result.success).toBe(false);
            expect(result.logs.some(l => l.type !== 'nodeOutput' && l.message.includes('No "Start Workflow" node'))).toBe(true);
        });

        it('should simulate a simple linear workflow', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'HTTP Request', httpRequest: { url: 'https://example.com', method: 'GET' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges, { test: true });

            expect(result.success).toBe(true);
            expect(result.outputs['2']).toBeDefined();
            expect(result.outputs['2'].status).toBe(200);
            expect(result.outputs['2'].data.simulated).toBe(true);
        });

        it('should simulate HTTP Request and return mock data', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: {
                        label: 'HTTP Request',
                        httpRequest: { url: 'https://api.test.com/users', method: 'POST' }
                    }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.logs.some(l => l.type === 'success' && l.stepLabel === 'HTTP Request')).toBe(true);
        });

        it('should simulate Send Email and return mock result', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Send Email', emailConfig: { recipient: 'user@test.com' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].status).toBe('sent');
            expect(result.outputs['2'].recipient).toBe('user@test.com');
        });

        it('should simulate Database Query and return mock rows', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Database Query', dbConfig: { dbType: 'postgres', query: 'SELECT * FROM users' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].rows).toBeDefined();
            expect(result.outputs['2'].rowCount).toBe(1);
        });

        it('should simulate If/Else with true condition', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'if', position: { x: 0, y: 100 }, data: { label: 'If / Else', condition: 'true' } },
                { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'True Branch' } },
                { id: '4', type: 'step', position: { x: 200, y: 200 }, data: { label: 'False Branch' } }
            ];
            const edges: Edge[] = [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true' },
                { id: 'e2-4', source: '2', target: '4', sourceHandle: 'false' }
            ];

            const result = await simulateWorkflow(nodes, edges, {});

            expect(result.success).toBe(true);
            expect(result.outputs['2'].condition).toBe(true);
            // True branch should be executed
            expect(result.outputs['3']).toBeDefined();
            expect(result.outputs['4']).not.toBeDefined();
        });

        it('should simulate If/Else with false condition', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'if', position: { x: 0, y: 100 }, data: { label: 'If / Else', condition: 'params.status === 200' } },
                { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'True Branch' } },
                { id: '4', type: 'step', position: { x: 200, y: 200 }, data: { label: 'False Branch' } }
            ];
            const edges: Edge[] = [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3', sourceHandle: 'true' },
                { id: 'e2-4', source: '2', target: '4', sourceHandle: 'false' }
            ];

            const result = await simulateWorkflow(nodes, edges, { status: 404 });

            expect(result.success).toBe(true);
            expect(result.outputs['2'].condition).toBe(false);
            // False branch should be executed
            expect(result.outputs['4']).toBeDefined();
        });

        it('should simulate a Loop with 1 iteration', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'loop', position: { x: 0, y: 100 }, data: { label: 'Loop', items: '[1, 2, 3]' } },
                { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'Loop Body' } },
                { id: '4', type: 'step', position: { x: 200, y: 200 }, data: { label: 'After Loop' } }
            ];
            const edges: Edge[] = [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3', sourceHandle: 'body' },
                { id: 'e2-4', source: '2', target: '4', sourceHandle: 'done' }
            ];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].simulatedLoop).toBe(true);
            expect(result.outputs['3']).toBeDefined(); // Body executed
        });

        it('should handle script execution errors gracefully', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Run Script', scriptConfig: { code: 'throw new Error("Test Error")' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            // Simulation should still complete (not crash) but log the error
            expect(result.logs.some(l => l.type === 'error' && l.message.includes('Script error'))).toBe(true);
        });

        it('should simulate Transform step', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Transform', transformConfig: { expression: 'return { message: "transformed" }' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].result.message).toBe('transformed');
        });

        it('should simulate AI Generation and return mock content', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'ai',
                    position: { x: 0, y: 100 },
                    data: { label: 'AI Generation', aiConfig: { model: 'gpt-4' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].content).toBe('Mock AI Content');
        });

        it('should simulate Wait for Event and return simulated reception', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Wait for Event', waitConfig: { event: 'payment_received' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].status).toBe('received');
            expect(result.outputs['2'].event).toBe('payment_received');
        });

        it('should simulate Approval step', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Approval', approvalConfig: { approverEmail: 'manager@example.com' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].status).toBe('approved');
            expect(result.outputs['2'].approver).toBe('manager@example.com');
        });

        it('should simulate Stream step', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Stream', streamConfig: { message: 'Processing step 1...' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].status).toBe('streamed');
            expect(result.outputs['2'].message).toBe('Processing step 1...');
        });

        it('should simulate Slack Message step', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Slack Message', slackConfig: { webhookUrl: 'https://hooks.slack.com/test', message: 'Build complete!' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const result = await simulateWorkflow(nodes, edges);

            expect(result.success).toBe(true);
            expect(result.outputs['2'].status).toBe('sent');
        });

        it('should simulate Sleep step with duration', async () => {
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                {
                    id: '2',
                    type: 'step',
                    position: { x: 0, y: 100 },
                    data: { label: 'Sleep', sleepConfig: { duration: '100ms' } }
                }
            ];
            const edges: Edge[] = [{ id: 'e1-2', source: '1', target: '2' }];

            const start = Date.now();
            const result = await simulateWorkflow(nodes, edges);
            const elapsed = Date.now() - start;

            expect(result.success).toBe(true);
            expect(result.outputs['2'].status).toBe('completed');
            // Sleep should have happened (at least 50ms in simulation)
            expect(elapsed).toBeGreaterThanOrEqual(50);
        });

        it('should prevent infinite loops with execution cap', async () => {
            // Create a workflow that would loop infinitely
            const nodes: Node[] = [
                { id: '1', type: 'step', position: { x: 0, y: 0 }, data: { label: 'Start Workflow' } },
                { id: '2', type: 'step', position: { x: 0, y: 100 }, data: { label: 'Step A' } },
                { id: '3', type: 'step', position: { x: 0, y: 200 }, data: { label: 'Step B' } }
            ];
            // Create a cycle: 1 -> 2 -> 3 -> 2
            const edges: Edge[] = [
                { id: 'e1-2', source: '1', target: '2' },
                { id: 'e2-3', source: '2', target: '3' },
                { id: 'e3-2', source: '3', target: '2' } // This creates a cycle
            ];

            const result = await simulateWorkflow(nodes, edges);

            // Should complete (not hang) and have a warning about infinite loop
            expect(result.logs.some(l => l.type !== 'nodeOutput' && l.message.includes('Infinite loop prevented'))).toBe(true);
        });
    });
});
