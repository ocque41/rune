import { Node, Edge } from '@xyflow/react';
import { saveRun, updateRunStatus, updateStepExecution, setRunWaiting, WorkflowRun, StepExecution } from './run-store';

type ExecutionContext = {
    runId: string;
    nodes: Node[];
    edges: Edge[];
    inputs: Record<string, any>; // outputs from previous nodes keyed by nodeId
    variables: Record<string, any>; // Global execution variables
    logs: any[];
};

export class WorkflowEngine {
    private context: ExecutionContext;

    constructor(
        private workflowId: string,
        private workflowName: string,
        private nodes: Node[],
        private edges: Edge[]
    ) {
        this.context = {
            runId: crypto.randomUUID(),
            nodes,
            edges,
            inputs: {},
            variables: {},
            logs: []
        };
    }

    /**
     * Start the workflow execution
     */
    async run(initialPayload: any = {}): Promise<WorkflowRun> {
        const startTime = new Date().toISOString();

        // Initial run record
        const run: WorkflowRun = {
            id: this.context.runId,
            workflowId: this.workflowId,
            workflowName: this.workflowName,
            status: 'running',
            startTime,
            args: [initialPayload],
            logs: [],
            steps: []
        };

        await saveRun(run);

        try {
            // Find Start Node
            const startNode = this.nodes.find(n => n.data.label === 'Start Workflow');
            if (!startNode) {
                throw new Error('No "Start Workflow" node found');
            }

            this.context.inputs[startNode.id] = initialPayload;
            this.log('info', 'Workflow execution started');

            // Start traversal
            // Using a queue for BFS traversal, but we need to handle async steps sequentially per path
            // For simplicity in v1: Basic BFS/processing queue
            const queue: { nodeId: string; input: any }[] = [{ nodeId: startNode.id, input: initialPayload }];
            const processedCount: Record<string, number> = {};

            while (queue.length > 0) {
                const { nodeId, input } = queue.shift()!;
                processedCount[nodeId] = (processedCount[nodeId] || 0) + 1;

                if (processedCount[nodeId] > 10) {
                    this.log('warn', `Node ${nodeId} execution limit reached (loop detection). Skipping.`);
                    continue;
                }

                await this.executeNode(nodeId, input, queue);
            }

            // Completion
            await updateRunStatus(this.context.runId, 'completed', this.context.inputs); // Save final state as result? Or specific output?
            // Re-fetch to get final object
            // For now, return what we have (updated locally)
            return {
                ...run,
                status: 'completed',
                endTime: new Date().toISOString(),
                result: this.context.inputs
            };

        } catch (error: any) {
            console.error('Workflow execution failed:', error);
            await updateRunStatus(this.context.runId, 'failed', undefined, error.message);
            throw error;
        }
    }

    /**
     * Execute a single node
     */
    private async executeNode(nodeId: string, input: any, queue: { nodeId: string; input: any }[]) {
        const node = this.nodes.find(n => n.id === nodeId)!;
        const data = node.data as any;
        const label = data.label;

        const startTime = new Date().toISOString();
        const stepId = crypto.randomUUID();

        // Log start
        // this.log('info', `Executing node: ${label}`, { nodeId, input });

        let result: any = { status: 'success' };
        let status: StepExecution['status'] = 'completed';
        let errorMsg: string | undefined;

        try {
            switch (label) {
                case 'Start Workflow':
                    result = input;
                    break;

                case 'HTTP Request':
                    result = await this.executeHttpRequest(data, input);
                    break;

                case 'Send Email':
                    result = await this.executeSendEmail(data, input);
                    break;

                case 'Run Script':
                    result = await this.executeScript(data, input);
                    break;

                case 'Transform':
                    result = await this.executeTransform(data, input);
                    break;

                case 'If / Else':
                case 'if': // handle type check for newer nodes
                    const conditionResult = await this.evaluateCondition(data, input);
                    result = { condition: conditionResult };
                    // Special handling for edge traversal
                    this.handleIfElseTraversal(node, conditionResult, input, queue);
                    return; // Return early, handled traversal manually

                // TODO: Add more steps (DB, AI, etc.)

                default:
                    // Pass through for now
                    result = { ...input, message: 'Step not implemented in runner yet' };
                    break;
            }
        } catch (err: any) {
            status = 'failed';
            errorMsg = err.message;
            this.log('error', `Step ${label} failed: ${err.message}`);
            throw err; // For now fail the whole workflow. In future, allow error handling paths.
        } finally {
            const endTime = new Date().toISOString();
            const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

            // Record Step Execution
            await updateStepExecution(this.context.runId, {
                stepId,
                stepLabel: label as string,
                status,
                startTime,
                endTime,
                durationMs,
                result,
                error: errorMsg
            });

            // Inject timing into result for context consistency
            if (result && typeof result === 'object') {
                result.timing = { durationMs };
            }

            // Update output context
            this.context.inputs[nodeId] = result;
        }

        // Standard Edge Traversal (if not handled by specific logic like If/Else)
        this.queueNextNodes(nodeId, result, queue);
    }

    private queueNextNodes(nodeId: string, input: any, queue: any[]) {
        const outgoing = this.edges.filter(e => e.source === nodeId);
        for (const edge of outgoing) {
            queue.push({ nodeId: edge.target, input });
        }
    }

    private handleIfElseTraversal(node: Node, conditionResult: boolean, input: any, queue: any[]) {
        const handleId = conditionResult ? 'true' : 'false';
        const edge = this.edges.find(e => e.source === node.id && e.sourceHandle === handleId);
        if (edge) {
            queue.push({ nodeId: edge.target, input });
        }
    }

    // --- Step Implementations ---

    private async executeHttpRequest(data: any, input: any) {
        const config = data.httpRequest;
        if (!config?.url) throw new Error('Missing URL');

        const response = await fetch(config.url, {
            method: config.method || 'GET',
            headers: config.headers,
            body: config.method !== 'GET' ? JSON.stringify(config.body || input) : undefined, // simplified body logic
        });

        const contentType = response.headers.get('content-type');
        let responseData;
        if (contentType?.includes('application/json')) {
            responseData = await response.json().catch(() => ({}));
        } else {
            responseData = await response.text();
        }

        return {
            status: response.status,
            statusText: response.statusText,
            data: responseData
        };
    }

    private async executeSendEmail(data: any, input: any) {
        const config = data.emailConfig;
        // In simulation/sandbox, we might mock this.
        // For real runner, implementation depends on configured providers.
        // For now, logging behavior similar to simulator unless env vars exist.

        if (process.env.RESEND_API_KEY) {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: config.recipient,
                    subject: config.subject || 'Workflow Notification',
                    html: config.body || JSON.stringify(input),
                }),
            });
            if (!response.ok) throw new Error('Failed to send email via Resend');
            return await response.json();
        }

        console.log('[Mock Email] Sent to:', config.recipient);
        return { mock: true, recipient: config.recipient };
    }

    private async executeScript(data: any, input: any) {
        const code = data.scriptConfig?.code;
        if (!code) return input;

        const fn = new Function('params', code);
        const res = fn(input);
        return {
            status: 'success',
            result: res
        };
    }

    private async executeTransform(data: any, input: any) {
        const expr = data.transformConfig?.expression;
        if (!expr) return input;
        const fn = new Function('params', expr);
        const res = fn(input);
        return {
            status: 'success',
            result: res
        };
    }

    private async evaluateCondition(data: any, input: any): Promise<boolean> {
        const condition = data.condition || 'true';
        const fn = new Function('params', `return ${condition};`);
        return !!fn(input);
    }

    // --- Helpers ---

    private async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
        console.log(`[WorkflowEngine] [${level}] ${message}`, data || '');
        // In real impl, use appendLog from run-store
        // await appendLog(this.context.runId, message, level);
    }
}
