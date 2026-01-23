import { SupabaseClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveRun, updateRunStatus, updateStepExecution, setRunWaiting, WorkflowRun, StepExecution, appendLog } from './run-store';

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
        private supabase: SupabaseClient,
        private workflowId: string,
        private workflowName: string,
        private nodes: Node[],
        private edges: Edge[],
        private userId: string,
        private workflowVersionId?: string
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
     * @param initialPayload - Data to start the workflow with
     * @param triggerNodeId - Optional: Specific node ID to start execution from (e.g. for Webhooks)
     */
    async run(initialPayload: any = {}, triggerNodeId?: string): Promise<WorkflowRun> {
        const startTime = new Date().toISOString();

        // Initial run record
        const run: WorkflowRun = {
            id: this.context.runId,
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId, // Added
            workflowName: this.workflowName,
            status: 'running',
            startTime,
            args: [initialPayload],
            logs: [],
            steps: []
        };

        await saveRun(this.supabase, run, this.userId);

        try {
            // Determine Trigger Node
            let startNode: Node | undefined;

            // 1. If a specific trigger node ID is provided, verify and use it
            if (triggerNodeId) {
                startNode = this.nodes.find(n => n.id === triggerNodeId);
                if (!startNode) {
                    throw new Error(`Specified trigger node "${triggerNodeId}" not found in workflow`);
                }
            } else {
                // 2. Auto-detect triggers if no specific ID provided
                // Search for valid triggers
                const triggerNodes = this.nodes.filter(n =>
                    (n.type === 'step' && n.data.label === 'Start Workflow') ||
                    n.type === 'webhook' ||
                    n.type === 'schedule'
                );

                if (triggerNodes.length === 0) {
                    throw new Error('No valid Trigger node found (Start, Webhook, or Schedule)');
                }

                // 3. For manual runs (no inputs keyed to specific nodes), prefer "Start Workflow"
                // If strictly one trigger exists, use it.
                if (triggerNodes.length === 1) {
                    startNode = triggerNodes[0];
                } else {
                    // Multiple triggers exist. 
                    // Prioritize 'Start Workflow' for manual/test runs
                    startNode = triggerNodes.find(n => n.data.label === 'Start Workflow');

                    // If no manual start, pick the first one (e.g. Schedule) but log specific warning
                    if (!startNode) {
                        startNode = triggerNodes[0];
                        this.log('warn', `Multiple triggers found. Defaulting to ${startNode.data.label || startNode.id}`);
                    }
                }
            }

            if (!startNode) {
                throw new Error('Could not determine entry point');
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
            await updateRunStatus(this.supabase, this.context.runId, 'completed', this.context.inputs);

            // Re-fetch to get final object? Or construct from known state.
            // For now, return what we have (updated locally)
            return {
                ...run,
                status: 'completed',
                endTime: new Date().toISOString(),
                result: this.context.inputs
            };

        } catch (error: any) {
            console.error('Workflow execution failed:', error);
            await updateRunStatus(this.supabase, this.context.runId, 'failed', undefined, error.message);
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

                case 'error':
                    result = await this.executeErrorHandler(data, input);
                    break;

                case 'AI Generate':
                    result = await this.executeAiGenerate(data, input);
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
            await updateStepExecution(this.supabase, this.context.runId, {
                stepId,
                stepLabel: label as string,
                status,
                startTime,
                endTime,
                durationMs,
                input, // Pass input to be saved
                result,
                error: errorMsg
            }, this.userId);

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

        console.log('[WorkflowEngine] executeHttpRequest called');
        console.log('[WorkflowEngine] HTTP config:', JSON.stringify(config, null, 2));

        // Parse headers - they may be stored as a JSON string
        let headers: Record<string, string> = {};
        if (config.headers) {
            if (typeof config.headers === 'string') {
                try {
                    headers = JSON.parse(config.headers);
                } catch (e) {
                    console.warn('[WorkflowEngine] Failed to parse headers JSON:', config.headers);
                }
            } else {
                headers = config.headers;
            }
        }

        // Parse body - may be stored as a JSON string
        let body: any = undefined;
        if (config.method !== 'GET' && config.body) {
            if (typeof config.body === 'string') {
                // The body might be a JSON string or contain template variables
                // For now, use it as-is if it looks like a template, otherwise try to parse
                body = config.body;
            } else {
                body = JSON.stringify(config.body);
            }
        } else if (config.method !== 'GET') {
            body = JSON.stringify(input);
        }

        console.log('[WorkflowEngine] Fetching:', config.url, config.method || 'GET');
        console.log('[WorkflowEngine] Headers:', headers);
        console.log('[WorkflowEngine] Body:', body);

        const response = await fetch(config.url, {
            method: config.method || 'GET',
            headers,
            body,
        });

        const contentType = response.headers.get('content-type');
        let responseData;
        if (contentType?.includes('application/json')) {
            responseData = await response.json().catch(() => ({}));
        } else {
            responseData = await response.text();
        }

        console.log('[WorkflowEngine] HTTP Response:', response.status, response.statusText);

        return {
            status: response.status,
            statusText: response.statusText,
            data: responseData
        };
    }

    private async executeSendEmail(data: any, input: any) {
        const config = data.emailConfig;

        // Debug logging
        console.log('[WorkflowEngine] executeSendEmail called');
        console.log('[WorkflowEngine] Raw data:', JSON.stringify(data, null, 2));
        console.log('[WorkflowEngine] emailConfig:', JSON.stringify(config, null, 2));

        const { sendEmail } = await import('./email');
        let smtpConfig = undefined;

        // Uses this.supabase instead of creating new client
        if (config?.sender) {
            console.log(`[WorkflowEngine] Looking up SMTP config for sender: ${config.sender}`);
            try {
                const { data: senderData } = await this.supabase
                    .from('verified_senders')
                    .select('smtp_config')
                    .eq('email', config.sender)
                    .single();

                if (senderData?.smtp_config) {
                    smtpConfig = senderData.smtp_config;
                    console.log('[WorkflowEngine] Found smtp_config:', smtpConfig);
                } else {
                    console.log('[WorkflowEngine] No smtp_config found, will use Resend');
                }
            } catch (err) {
                console.warn('[WorkflowEngine] Could not fetch sender config:', err);
            }
        } else {
            console.log('[WorkflowEngine] No sender specified in config');
        }

        const emailParams = {
            from: config?.sender || process.env.SMTP_FROM,
            to: config?.recipient,
            subject: config?.subject || 'Workflow Notification',
            html: config?.body || JSON.stringify(input),
            smtpConfig
        };

        console.log('[WorkflowEngine] Calling sendEmail with:', JSON.stringify(emailParams, null, 2));

        try {
            const result = await sendEmail(emailParams);
            console.log('[WorkflowEngine] Email sent successfully:', result);
            return result;
        } catch (error: any) {
            console.error('[Email] Failed:', error);
            throw new Error(`Email failed: ${error.message}`);
        }
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

    async executeErrorHandler(data: any, input: any) {
        const { actionType, config } = data;
        this.log('info', `Executing Error Handler: ${actionType}`);

        if (actionType === 'email') {
            // Adapt config to match executeSendEmail expectation
            return this.executeSendEmail({
                emailConfig: {
                    recipient: config.recipient,
                    subject: config.subject,
                    body: config.body,
                    sender: 'alerts@cumulus.app'
                }
            }, input);
        } else if (actionType === 'slack') {
            return this.executeHttpRequest({
                httpRequest: {
                    method: 'POST',
                    url: config.webhookUrl,
                    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
                    body: JSON.stringify({ text: config.message || `Alert from ${this.workflowName}` })
                }
            }, input);
        } else if (actionType === 'webhook') {
            return this.executeHttpRequest({
                httpRequest: {
                    method: 'POST',
                    url: config.webhookUrl,
                    headers: JSON.stringify({ 'Content-Type': 'application/json' }),
                    body: config.payload || JSON.stringify(input)
                }
            }, input);
        }

        return { handled: true, action: actionType };
    }

    private async executeAiGenerate(data: any, input: any) {
        const config = data.aiConfig || {};
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            throw new Error("GOOGLE_API_KEY is not configured in the environment.");
        }

        let prompt = config.prompt;
        if (!prompt) {
            // Check if input is string, use that
            if (typeof input === 'string') prompt = input;
            else if (input.prompt) prompt = input.prompt;
            else prompt = JSON.stringify(input);
        } else {
            // Templating (simple interpolation) for {{input}} or {{input.field}}
            // For V1, simplest is just replacing {{input}} with JSON
            prompt = prompt.replace('{{input}}', typeof input === 'string' ? input : JSON.stringify(input));
            // Todo: Better templating engine
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = config.model || 'gemini-3-pro-preview';

        // Prepare generation config with thinking config support
        const generationConfig: any = {};
        if (config.thinkingConfig) {
            generationConfig.thinkingConfig = config.thinkingConfig;
        }

        // Use gemini-3-pro-preview as default if user requested 3.0 Pro
        const model = genAI.getGenerativeModel({
            model: modelName,
            ...generationConfig
        });

        this.log('info', `Generating AI content with model ${modelName}`, { promptLength: prompt.length, thinking: !!config.thinkingConfig });

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            this.log('info', `AI Generation successful. Length: ${text.length}`);

            return {
                status: 'success',
                text: text,
                // Try to parse JSON if requested or looks like JSON?
                // For now, raw text is safer as 'result'
                data: text
            };
        } catch (e: any) {
            this.log('error', `AI Generation Failed: ${e.message}`);
            throw e;
        }
    }

    private async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
        console.log(`[WorkflowEngine] [${level}] ${message}`, data || '');
        // Use atomic appendLog
        await appendLog(this.supabase, this.context.runId, message, level);
    }
}
