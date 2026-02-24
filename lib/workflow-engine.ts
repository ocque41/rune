import { SupabaseClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
    saveRun,
    updateRunStatus,
    updateStepExecution,
    setRunWaiting,
    WorkflowRun,
    StepExecution,
    appendLog,
    type WaitingFor,
} from './run-store';
import { ingestAutonomyEvent } from '@/lib/autonomy/events';
import jsonata from 'jsonata';
import { getNodeKindDisplayName, resolveNodeKind } from './workflow/node-catalog';
import { sendEmail } from './email';
import {
    buildModeExecutionPolicy,
    normalizeWorkflowMode,
    normalizeWorkflowModeConfig,
    DEFAULT_WORKFLOW_MODE,
    type WorkflowMode,
    type WorkflowModeConfig,
    type ModeExecutionPolicy,
} from './workflow/modes';

type ExecutionContext = {
    runId: string;
    nodes: Node[];
    edges: Edge[];
    inputs: Record<string, any>; // outputs from previous nodes keyed by nodeId
    variables: Record<string, any>; // Global execution variables
    logs: any[];
    waitingFor?: WaitingFor;
};

export class WorkflowEngine {
    private context: ExecutionContext;
    private workflowMode: WorkflowMode;
    private workflowModeConfig: WorkflowModeConfig;
    private modePolicy: ModeExecutionPolicy;
    private pausedForWaiting = false;
    private executionStats = {
        startedAtMs: 0,
        totalNodeExecutions: 0,
        perNodeExecutions: {} as Record<string, number>,
        alertedThresholds: new Set<number>(),
        alertKeys: new Set<string>(),
        approvalNodes: new Set<string>(),
        approvalExecutions: 0,
    };

    constructor(
        private supabase: SupabaseClient,
        private workflowId: string,
        private workflowName: string,
        private nodes: Node[],
        private edges: Edge[],
        private userId: string,
        private workflowVersionId?: string,
        workflowMode: WorkflowMode = DEFAULT_WORKFLOW_MODE,
        workflowModeConfig: WorkflowModeConfig = {},
    ) {
        this.workflowMode = normalizeWorkflowMode(workflowMode);
        this.workflowModeConfig = normalizeWorkflowModeConfig(this.workflowMode, workflowModeConfig);
        this.modePolicy = buildModeExecutionPolicy(this.workflowMode, this.workflowModeConfig);

        const approvalNodes = nodes.filter((node) => resolveNodeKind(node as any) === 'approval');
        approvalNodes.forEach((node) => this.executionStats.approvalNodes.add(node.id));

        this.context = {
            runId: crypto.randomUUID(),
            nodes,
            edges,
            inputs: {},
            variables: {},
            logs: [],
        };
    }

    /**
     * Start the workflow execution
     * @param initialPayload - Data to start the workflow with
     * @param triggerNodeId - Optional: Specific node ID to start execution from (e.g. for Webhooks)
     */
    async run(initialPayload: any = {}, triggerNodeId?: string): Promise<WorkflowRun> {
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
            const triggerNodes = this.nodes.filter((node) => {
                const kind = resolveNodeKind(node as any);
                return kind === 'startWorkflow' || kind === 'webhook' || kind === 'schedule';
            });

            if (triggerNodes.length === 0) {
                throw new Error('No valid Trigger node found (Start, Webhook, or Schedule)');
            }

            if (triggerNodes.length === 1) {
                startNode = triggerNodes[0];
            } else {
                startNode = triggerNodes.find((node) => resolveNodeKind(node as any) === 'startWorkflow');
                if (!startNode) {
                    startNode = triggerNodes[0];
                    this.log('warn', `Multiple triggers found. Defaulting to ${this.getNodeLabel(startNode)}`);
                }
            }
        }

        if (!startNode) {
            throw new Error('Could not determine entry point');
        }

        return this.runInternal([{ nodeId: startNode.id, input: initialPayload }], [initialPayload]);
    }

    /**
     * Execute a specific subgraph plan (multiple start nodes supported)
     */
    async runPlan(startNodes: { nodeId: string; input?: any }[], metadata?: { trigger?: string }): Promise<WorkflowRun> {
        if (!startNodes || startNodes.length === 0) {
            throw new Error('No start nodes provided for plan execution');
        }

        const queue = startNodes.map((node) => ({
            nodeId: node.nodeId,
            input: node.input ?? {}
        }));

        const args = queue.map((item) => item.input);
        return this.runInternal(queue, args, metadata);
    }

    private async runInternal(
        queue: { nodeId: string; input: any }[],
        args: any[] = [],
        metadata?: { trigger?: string }
    ): Promise<WorkflowRun> {
        const startTime = new Date().toISOString();

        const run: WorkflowRun = {
            id: this.context.runId,
            workflowId: this.workflowId,
            workflowVersionId: this.workflowVersionId,
            workflowName: this.workflowName,
            status: 'running',
            startTime,
            args,
            logs: [],
            steps: []
        };

        await saveRun(this.supabase, run, this.userId);

        try {
            this.pausedForWaiting = false;
            this.executionStats.startedAtMs = Date.now();
            this.executionStats.totalNodeExecutions = 0;
            this.executionStats.perNodeExecutions = {};
            this.executionStats.alertedThresholds = new Set<number>();
            this.executionStats.alertKeys = new Set<string>();
            this.executionStats.approvalExecutions = 0;

            if (metadata?.trigger) {
                await this.log('info', `Workflow execution started (trigger: ${metadata.trigger})`);
            } else {
                await this.log('info', `Workflow execution started (mode: ${this.workflowMode})`);
            }

            for (const entry of queue) {
                this.context.inputs[entry.nodeId] = entry.input;
            }

            const processedCount: Record<string, number> = {};

            while (queue.length > 0) {
                const { nodeId, input } = queue.shift()!;
                processedCount[nodeId] = (processedCount[nodeId] || 0) + 1;
                await this.enforceExecutionPolicy(nodeId, processedCount[nodeId]);
                await this.executeNode(nodeId, input, queue);
                if (this.pausedForWaiting) break;
            }

            if (this.pausedForWaiting) {
                await updateRunStatus(this.supabase, this.context.runId, 'waiting', this.context.inputs);
                try {
                    await ingestAutonomyEvent(this.userId, {
                        source_type: 'system',
                        dedupe_key: `run-waiting-${this.context.runId}`,
                        workflow_id: this.workflowId,
                        payload: {
                            event: 'run.waiting',
                            run_id: this.context.runId,
                            status: 'waiting',
                            waiting_for: this.context.waitingFor as any,
                        }
                    }, this.supabase as any);
                } catch (e) {
                    console.warn('[Autonomy] Failed to emit waiting event', e);
                }

                return {
                    ...run,
                    status: 'waiting',
                    waitingFor: this.context.waitingFor,
                    endTime: undefined,
                    result: this.context.inputs,
                };
            }

            await updateRunStatus(this.supabase, this.context.runId, 'completed', this.context.inputs);

            try {
                await ingestAutonomyEvent(this.userId, {
                    source_type: 'system',
                    dedupe_key: `run-completed-${this.context.runId}`,
                    workflow_id: this.workflowId,
                    payload: {
                        event: 'run.completed',
                        run_id: this.context.runId,
                        status: 'completed'
                    }
                }, this.supabase as any);
            } catch (e) {
                console.warn('[Autonomy] Failed to emit completion event', e);
            }

            return {
                ...run,
                status: 'completed',
                endTime: new Date().toISOString(),
                result: this.context.inputs
            };

        } catch (error: any) {
            console.error('Workflow execution failed:', error);
            await updateRunStatus(this.supabase, this.context.runId, 'failed', undefined, error.message);

            try {
                await ingestAutonomyEvent(this.userId, {
                    source_type: 'system',
                    dedupe_key: `run-failed-${this.context.runId}`,
                    workflow_id: this.workflowId,
                    payload: {
                        event: 'run.failed',
                        run_id: this.context.runId,
                        status: 'failed',
                        error: error.message
                    }
                }, this.supabase as any);
            } catch (e) {
                console.warn('[Autonomy] Failed to emit failure event', e);
            }
            throw error;
        }
    }

    /**
     * Execute a single node
     */
    private async executeNode(nodeId: string, input: any, queue: { nodeId: string; input: any }[]) {
        const node = this.nodes.find(n => n.id === nodeId)!;
        const nodeKind = resolveNodeKind(node as any);
        const data = node.data as any;
        const label = this.getNodeLabel(node);

        const startTime = new Date().toISOString();
        const stepId = nodeId;

        // Log start
        // this.log('info', `Executing node: ${label}`, { nodeId, input });

        let result: any = { status: 'success' };
        let status: StepExecution['status'] = 'completed';
        let errorMsg: string | undefined;

        try {
            switch (nodeKind) {
                case 'startWorkflow':
                    result = input;
                    break;

                case 'httpRequest':
                    result = await this.executeHttpRequest(data, input);
                    break;

                case 'sendEmail':
                    result = await this.executeSendEmail(data, input);
                    break;

                case 'runScript':
                    result = await this.executeScript(data, input);
                    break;

                case 'transform':
                    result = await this.executeTransform(data, input);
                    break;

                case 'errorHandler':
                    result = await this.executeErrorHandler(data, input);
                    break;

                case 'ai':
                    result = await this.executeAiGenerate(data, input);
                    break;
                
                case 'dataValidation':
                    result = await this.executeDataValidation(data, input);
                    break;

                case 'twilioMessage':
                    result = await this.executeTwilioMessage(data, input);
                    break;

                case 'approval':
                    this.executionStats.approvalExecutions += 1;
                    status = 'waiting';
                    result = await this.executeApproval(data, input);
                    this.pausedForWaiting = true;
                    queue.length = 0;
                    return;

                case 'ifElse':
                    const conditionResult = await this.evaluateCondition(data, input);
                    result = { condition: conditionResult };
                    // Special handling for edge traversal
                    this.handleIfElseTraversal(node, conditionResult, input, queue);
                    return; // Return early, handled traversal manually

                default:
                    if (node.type === 'if') {
                        const conditionResult = await this.evaluateCondition(data, input);
                        result = { condition: conditionResult };
                        this.handleIfElseTraversal(node, conditionResult, input, queue);
                        return;
                    }
                    // Pass through for unsupported kinds for backward compatibility.
                    result = { ...input, message: `Step ${label} not implemented in runner yet` };
                    break;
            }
        } catch (err: any) {
            status = 'failed';
            errorMsg = err.message;
            await this.log('error', `Step ${label} failed: ${err.message}`);
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

        if (this.pausedForWaiting) {
            return;
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

    private async enforceExecutionPolicy(nodeId: string, nodeExecutionCount: number) {
        this.executionStats.totalNodeExecutions += 1;
        this.executionStats.perNodeExecutions[nodeId] = nodeExecutionCount;

        const elapsedMinutes = (Date.now() - this.executionStats.startedAtMs) / 60000;

        if (this.workflowMode !== 'circular') {
            if (nodeExecutionCount > 1000) {
                throw new Error(`Execution stopped: node "${nodeId}" exceeded safe retry limit.`);
            }
            return;
        }

        const executionUsagePct = (this.executionStats.totalNodeExecutions / this.modePolicy.maxNodeExecutions) * 100;
        for (const threshold of this.modePolicy.alertThresholds) {
            if (executionUsagePct < threshold || this.executionStats.alertedThresholds.has(threshold)) continue;
            this.executionStats.alertedThresholds.add(threshold);
            await this.emitCircularAlert(
                `threshold-${threshold}`,
                `Circular execution reached ${threshold}% of emergency execution capacity.`,
                {
                    threshold,
                    total_executions: this.executionStats.totalNodeExecutions,
                    max_node_executions: this.modePolicy.maxNodeExecutions,
                },
                'warn',
            );
        }

        if (this.executionStats.totalNodeExecutions >= this.modePolicy.maxNodeExecutions) {
            await this.emitCircularAlert(
                'emergency-execution-cap',
                'Emergency stop activated: circular execution count reached the safety cap.',
                {
                    total_executions: this.executionStats.totalNodeExecutions,
                    max_node_executions: this.modePolicy.maxNodeExecutions,
                },
                'error',
            );
            throw new Error('Emergency stop: maximum node executions reached for circular mode.');
        }

        if (elapsedMinutes >= this.modePolicy.maxRuntimeMinutes) {
            await this.emitCircularAlert(
                'emergency-runtime-cap',
                'Emergency stop activated: circular runtime reached the safety cap.',
                {
                    elapsed_minutes: Number(elapsedMinutes.toFixed(2)),
                    max_runtime_minutes: this.modePolicy.maxRuntimeMinutes,
                },
                'error',
            );
            throw new Error('Emergency stop: maximum runtime reached for circular mode.');
        }

        if (this.executionStats.totalNodeExecutions >= 100) {
            const [dominantNodeId, dominantCount] = Object.entries(this.executionStats.perNodeExecutions)
                .sort((a, b) => b[1] - a[1])[0] || [nodeId, nodeExecutionCount];
            const dominanceRatio = dominantCount / this.executionStats.totalNodeExecutions;

            if (dominanceRatio >= 0.9) {
                await this.emitCircularAlert(
                    'probable-infinite-loop',
                    'Probable infinite loop detected: one node is dominating execution.',
                    {
                        dominant_node_id: dominantNodeId,
                        dominant_ratio: Number(dominanceRatio.toFixed(4)),
                        dominant_count: dominantCount,
                        total_executions: this.executionStats.totalNodeExecutions,
                    },
                    'warn',
                );
            } else if (dominanceRatio >= 0.7) {
                await this.emitCircularAlert(
                    'single-node-domination',
                    'Execution risk detected: one node is being executed repeatedly.',
                    {
                        dominant_node_id: dominantNodeId,
                        dominant_ratio: Number(dominanceRatio.toFixed(4)),
                        dominant_count: dominantCount,
                        total_executions: this.executionStats.totalNodeExecutions,
                    },
                    'warn',
                );
            }
        }

        if (
            this.executionStats.approvalNodes.size > 0
            && this.executionStats.approvalExecutions === 0
            && (this.executionStats.totalNodeExecutions >= 500 || elapsedMinutes >= 30)
        ) {
            await this.emitCircularAlert(
                'approval-bypass-risk',
                'Approval bypass risk: approval steps exist but have not been reached during prolonged circular execution.',
                {
                    approval_nodes: Array.from(this.executionStats.approvalNodes),
                    total_executions: this.executionStats.totalNodeExecutions,
                    elapsed_minutes: Number(elapsedMinutes.toFixed(2)),
                },
                'warn',
            );
        }
    }

    private async emitCircularAlert(
        alertKey: string,
        message: string,
        payload: Record<string, unknown>,
        level: 'warn' | 'error',
    ) {
        if (this.executionStats.alertKeys.has(alertKey)) return;
        this.executionStats.alertKeys.add(alertKey);

        const payloadText = Object.keys(payload).length > 0 ? ` ${JSON.stringify(payload)}` : '';
        await this.log(level, `[Circular Alert] ${message}${payloadText}`);

        try {
            await ingestAutonomyEvent(this.userId, {
                source_type: 'system',
                dedupe_key: `run-alert-${this.context.runId}-${alertKey}`,
                workflow_id: this.workflowId,
                payload: {
                    event: 'run.circular_alert',
                    run_id: this.context.runId,
                    workflow_id: this.workflowId,
                    workflow_name: this.workflowName,
                    mode: this.workflowMode,
                    level,
                    message,
                    alert_key: alertKey,
                    ...payload,
                },
            }, this.supabase as any);
        } catch (error) {
            console.warn('[WorkflowEngine] Failed to ingest circular alert event:', error);
        }

        try {
            if (typeof (this.supabase as any)?.from === 'function') {
                await (this.supabase as any)
                    .from('rune_notifications')
                    .insert({
                        user_id: this.userId,
                        type: 'agent',
                        title: 'Workflow safety alert',
                        message,
                        link: `/runs/${this.context.runId}`,
                    });
            }
        } catch (error) {
            console.warn('[WorkflowEngine] Failed to create notification alert:', error);
        }

        const recipients = this.getAlertRecipients();
        if (recipients.length === 0) return;

        await Promise.allSettled(
            recipients.map((to) => sendEmail({
                to,
                subject: `[Rune] Workflow safety alert: ${this.workflowName}`,
                html: `<p>${message}</p><pre>${JSON.stringify({
                    run_id: this.context.runId,
                    workflow_id: this.workflowId,
                    workflow_name: this.workflowName,
                    mode: this.workflowMode,
                    ...payload,
                }, null, 2)}</pre>`,
            })),
        );
    }

    private getAlertRecipients(): string[] {
        const raw =
            process.env.RUNE_WORKFLOW_ALERT_EMAILS
            || process.env.RUNE_WORKFLOW_ALERT_EMAIL
            || '';

        return raw
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
    }

    private async executeApproval(data: any, input: any) {
        const approvalConfig = data.approvalConfig || data || {};
        const approverEmail = approvalConfig.approverEmail || 'approver@example.com';
        const timeout = approvalConfig.timeout || '24h';
        const waitingFor: WaitingFor = {
            type: 'approval',
            identifier: `approval-${this.context.runId}-${Date.now()}`,
            since: new Date().toISOString(),
        };

        this.context.waitingFor = waitingFor;
        await setRunWaiting(this.supabase, this.context.runId, waitingFor);
        await this.log('info', `Waiting for approval from ${approverEmail} (timeout: ${timeout}).`);

        return {
            status: 'waiting',
            approverEmail,
            timeout,
            waitingFor,
            input,
        };
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

            let errorMessage = error.message || 'Unknown email error';

            // Critical Hint for AI Agent to stop infinite loops on Resend restrictions
            if (errorMessage.includes("Invalid `to` field") || errorMessage.includes("Resend free tier")) {
                errorMessage += " [AGENT HINT: This is a Resend Free Tier restriction. You can ONLY send to the email address registered with the Resend account. Do NOT retry with random emails. Ask the user for their registered email address.]";
            }

            throw new Error(`Email failed: ${errorMessage}`);
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
        const expr = data.transformConfig?.expression || data.mapping; // Use mapping from node.data directly
        const transformType = data.transformConfig?.transformType || data.transformType || 'javascript'; // Get transformType
        if (!expr) return input;

        let res;
        try {
            if (transformType === 'jsonata') {
                const expression = jsonata(expr);
                res = await expression.evaluate(input);
            } else { // 'javascript'
                const fn = new Function('params', expr);
                res = fn(input);
            }
        } catch (error: any) {
            console.error("[WorkflowEngine] Transform execution failed:", error.message);
            throw error;
        }

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

    private getNodeLabel(node: Node): string {
        const label = (node.data as any)?.label;
        if (typeof label === 'string' && label.trim().length > 0) {
            return label;
        }
        return getNodeKindDisplayName(resolveNodeKind(node as any));
    }

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

        // Use gemini-2.0-flash as the only supported model for now
        const modelName = 'gemini-2.0-flash';

        // Prepare generation config with thinking config support
        const generationConfig: any = {};
        if (config.thinkingConfig) {
            generationConfig.thinkingConfig = config.thinkingConfig;
        }

        const model = genAI.getGenerativeModel({
            model: modelName,
            ...generationConfig
        });

        this.log('info', `Generating AI content with model ${modelName}`, { promptLength: prompt.length, thinking: !!config.thinkingConfig });
        const startTs = Date.now();

        try {
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // Usage Logging
            const usage = response.usageMetadata;
            const latencyMs = Date.now() - startTs;

            // Dynamically import logUsageEvent to avoid circular dependencies if any (though usually fine)
            // Or just import at top level. Let's assume top level import is safe or do it here.
            // Using dynamic import to be safe with existing imports.
            const { logUsageEvent } = await import('@/lib/usage/log');

            await logUsageEvent({
                userId: this.userId, // WorkflowEngine has this.userId
                source: 'autonomy_execute',
                model: modelName,
                provider: 'google',
                workflowId: this.workflowId,
                runId: this.context.runId,
                status: 'success',
                latencyMs,
                inputTokens: usage?.promptTokenCount,
                outputTokens: usage?.candidatesTokenCount,
                totalTokens: usage?.totalTokenCount,
                // cachedTokens: usage?.cachedContentTokenCount, // API might differ, check types if needed
                metadata: {
                    stepId: 'ai-generate-node', // ideally we pass the node ID here, but this method signature doesn't have it.
                    // We could pass it in 'data' or 'input' if we changed the signature.
                    // For now, this is better than nothing.
                }
            });

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
            // Log failure
            const { logUsageEvent } = await import('@/lib/usage/log');
            await logUsageEvent({
                userId: this.userId,
                source: 'autonomy_execute',
                model: modelName,
                provider: 'google',
                workflowId: this.workflowId,
                runId: this.context.runId,
                status: 'error',
                errorCode: 'GENERATION_FAILED',
                latencyMs: Date.now() - startTs,
                metadata: { error: e.message }
            });
            throw e;
        }
    }

    private async executeDataValidation(data: any, input: any) {
        const schema = data.schema;
        const dataPath = data.dataPath;
        const onFailure = data.onFailure;

        if (!schema) throw new Error('Missing validation schema');

        try {
            const ajv = new (await import('ajv')).default(); // Dynamic import to avoid top-level issues if not always needed
            const validate = ajv.compile(JSON.parse(schema));

            let dataToValidate = input; // Start with the input to the node
            // Traverse dataPath to get the target data if specified
            if (dataPath && dataPath !== 'params') {
                try {
                    const dataPathSegments = dataPath.split('.');
                    for (const segment of dataPathSegments) {
                        if (dataToValidate && typeof dataToValidate === 'object' && segment in dataToValidate) {
                            dataToValidate = dataToValidate[segment];
                        } else {
                            dataToValidate = undefined; // Path not found
                            break;
                        }
                    }
                } catch (e) {
                    console.warn("[WorkflowEngine] Error traversing dataPath:", e);
                    dataToValidate = undefined; // Treat as not found
                }
            }
            
            const isValid = validate(dataToValidate);

            if (!isValid && onFailure === 'failWorkflow') {
                throw new Error("Data validation failed: " + JSON.stringify(validate.errors));
            }

            return {
                status: isValid ? 'success' : 'failed',
                isValid: isValid,
                errors: validate.errors || [],
                validatedData: dataToValidate,
                onFailureStrategy: onFailure
            };
        } catch (error: any) {
            console.error("[WorkflowEngine] Error during data validation:", error.message);
            throw error;
        }
    }

    private async executeTwilioMessage(data: any, input: any) {
        const fromPhoneNumber = data.fromPhoneNumber;
        const toPhoneNumber = data.toPhoneNumber;
        const messageBody = data.messageBody;
        const accountSidSecretName = data.accountSidSecretName;
        const authTokenSecretName = data.authTokenSecretName;

        // Get secrets from secrets manager (which will resolve via provider)
        const secretsManager = await import('@/lib/secrets-manager');
        const accountSid = await secretsManager.getSecret(accountSidSecretName);
        const authToken = await secretsManager.getSecret(authTokenSecretName);

        if (!accountSid || !authToken) {
            throw new Error("Twilio Account SID or Auth Token secret not found.");
        }

        try {
            const twilioClient = (await import('twilio')).default(accountSid, authToken); // Dynamic import for twilio
            const message = await twilioClient.messages.create({
                to: toPhoneNumber,
                from: fromPhoneNumber,
                body: messageBody,
            });
            console.log("[WorkflowEngine] SMS sent successfully:", message.sid);
            return {
                status: 'sent',
                messageSid: message.sid,
            };
        } catch (error: any) {
            console.error("[WorkflowEngine] Failed to send SMS via Twilio:", error.message);
            throw error;
        }
    }

    private async log(level: 'info' | 'warn' | 'error', message: string, data?: any) {
        console.log(`[WorkflowEngine] [${level}] ${message}`, data || '');
        try {
            await appendLog(this.supabase, this.context.runId, message, level);
        } catch (error) {
            console.warn('[WorkflowEngine] Failed to append run log:', error);
        }
    }
}
